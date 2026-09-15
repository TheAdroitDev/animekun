import { count, and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { aiRequests } from "@/db/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    current: number;
}

interface DenyCacheEntry {
    /** Epoch ms — deny is valid until this timestamp (midnight UTC). */
    deniedUntil: number;
}

// ─── In-Memory Deny Cache ────────────────────────────────────────────────────
//
// WHY: Once we know a user has hit their daily limit, there's no reason to ask
// the database again. We cache the "denied" state per user+endpoint and skip
// the DB entirely until the cache entry expires at midnight UTC.
//
// SAFETY ON SERVERLESS: The cache lives in the process. On a cold start it's
// empty — that's fine. The worst case is one extra DB round-trip to rediscover
// the limit. The atomic SQL (below) is the real protection against races; this
// cache is purely a performance optimization.
// ─────────────────────────────────────────────────────────────────────────────

const denyCache = new Map<string, DenyCacheEntry>();

function buildCacheKey(userId: string, endpoint: string): string {
    return `${userId}:${endpoint}`;
}

/**
 * Returns the epoch ms for the next midnight UTC — the moment the daily limit
 * resets and a cached denial should expire.
 */
function nextMidnightUTC(): number {
    const now = new Date();

    return Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1, // next day, 00:00:00 UTC
    );
}

/**
 * Returns the start of today in UTC as a Date, used for the SQL WHERE clause.
 */
function startOfTodayUTC(): Date {
    const now = new Date();

    return new Date(
        Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
        ),
    );
}

/**
 * Check if the user is already cached as denied. If the entry exists but has
 * expired (past midnight UTC), clean it up and return false.
 */
function isDeniedByCache(key: string): boolean {
    const entry = denyCache.get(key);

    if (!entry) return false;

    if (Date.now() >= entry.deniedUntil) {
        // Past midnight — daily limit has reset. Evict stale entry.
        denyCache.delete(key);
        return false;
    }

    return true;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Fetches the current request count for a user+endpoint today.
 * Wrapped in its own try/catch so a count failure is isolated.
 */
async function fetchCurrentCount(
    userId: string,
    endpoint: string,
    today: Date,
): Promise<number> {
    try {
        const [result] = await db
            .select({ count: count() })
            .from(aiRequests)
            .where(
                and(
                    eq(aiRequests.userId, userId),
                    eq(aiRequests.endpoint, endpoint),
                    gte(aiRequests.createdAt, today),
                ),
            );

        return Number(result?.count ?? 0);
    } catch (error) {
        console.error("[rate-limit] Failed to fetch current count:", error);
        throw new Error("Rate limiter unavailable");
    }
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Database-backed, serverless-safe rate limiter.
 *
 * **Atomic**: Uses a single INSERT … SELECT … WHERE count < limit query so
 * the check-and-insert happens in one database operation — no race window.
 *
 * **Cached**: Once a user is denied, subsequent calls skip the DB entirely
 * until midnight UTC (when the daily limit resets).
 *
 * @param userId   - The authenticated user's UUID
 * @param endpoint - Logical endpoint name (e.g. "generate", "quiz")
 * @param limit    - Max allowed requests per day for this endpoint
 *
 * @example
 * ```ts
 * const { success, remaining } = await rateLimit(userId, "generate", 5);
 * if (!success) return ApiResponse.error("Rate limit exceeded", 429);
 * ```
 */
export async function rateLimit(
    userId: string,
    endpoint: string,
    limit: number,
): Promise<RateLimitResult> {
    const cacheKey = buildCacheKey(userId, endpoint);

    // ── Layer 1: In-memory deny cache (0 DB calls) ──────────────────────
    if (isDeniedByCache(cacheKey)) {
        return {
            success: false,
            limit,
            remaining: 0,
            current: limit, // at or above the limit
        };
    }

    const today = startOfTodayUTC();

    // ── Layer 2: Atomic INSERT with subquery (1 DB call) ────────────────
    //
    // This single SQL statement checks the count AND inserts in one shot.
    // If count >= limit, zero rows are inserted — no race window.
    //
    // Equivalent SQL:
    //   INSERT INTO ai_requests (id, user_id, endpoint, created_at)
    //   SELECT gen_random_uuid(), $userId, $endpoint, NOW()
    //   WHERE (
    //     SELECT COUNT(*) FROM ai_requests
    //     WHERE user_id = $userId AND endpoint = $endpoint AND created_at >= $today
    //   ) < $limit

    let inserted: boolean;

    try {
        const result = await db.execute(sql`
            INSERT INTO ai_requests (id, user_id, endpoint, created_at)
            SELECT gen_random_uuid(), ${userId}, ${endpoint}, NOW()
            WHERE (
                SELECT COUNT(*)
                FROM ai_requests
                WHERE user_id = ${userId}
                  AND endpoint = ${endpoint}
                  AND created_at >= ${today}
            ) < ${limit}
        `);

        // Neon HTTP driver: result.rowCount tells us if a row was inserted
        inserted = (result.rowCount ?? 0) > 0;
    } catch (error) {
        console.error("[rate-limit] Atomic INSERT failed:", error);
        throw new Error("Rate limiter unavailable");
    }

    // ── Post-INSERT: Fetch count for the response ───────────────────────
    const current = await fetchCurrentCount(userId, endpoint, today);

    if (!inserted) {
        // User hit the limit — cache it to avoid future DB calls until reset
        denyCache.set(cacheKey, { deniedUntil: nextMidnightUTC() });

        return {
            success: false,
            limit,
            remaining: 0,
            current,
        };
    }

    return {
        success: true,
        limit,
        remaining: Math.max(limit - current, 0),
        current,
    };
}
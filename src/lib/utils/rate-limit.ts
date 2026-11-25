import { sql } from "drizzle-orm";

import { db } from "@/db";

/**
 * Daily request limits (server only), stored in ai_usage: one counter row per
 * key per endpoint per UTC day. Two keys are checked: "user:<id>" (per user)
 * and "global" (the whole app, e.g. under the Gemini free-tier quota).
 *
 * Exact under parallel requests: ON CONFLICT DO UPDATE locks the row and
 * re-checks `count < limit` on its latest value, so 30 requests at once
 * can't all slip in. One statement per check (neon-http has no
 * transactions); no in-memory cache (it wouldn't survive serverless, and
 * wouldn't know about refunds).
 */

export interface DailyLimits {
    perUser: number;
    global: number;
}

export type DailyLimitResult =
    | { allowed: true; remaining: number; day: string }
    | { allowed: false; reason: "user" | "global"; remaining: number; day: string };

const GLOBAL_KEY = "global";
const userKey = (userId: string) => `user:${userId}`;

/** Today's date in UTC, e.g. "2026-11-25". Limits reset at 00:00 UTC. */
function utcDay(): string {
    return new Date().toISOString().slice(0, 10);
}

type ConsumeRow = { user_count: number | null; global_count: number | null };

/**
 * Use one request: raises the user's counter, then the global one, each only
 * while it's under its limit. Pass `day` back to refundDailyLimit if the
 * work fails, so the user gets the try back.
 */
export async function consumeDailyLimit(
    userId: string,
    endpoint: string,
    limits: DailyLimits,
): Promise<DailyLimitResult> {
    const day = utcDay();
    const key = userKey(userId);

    // u runs first; g only runs when u counted the request (it reads u's
    // RETURNING), so a user who is over their limit never touches "global".
    const result = await db.execute<ConsumeRow>(sql`
        WITH u AS (
            INSERT INTO ai_usage (key, endpoint, day, count)
            VALUES (${key}, ${endpoint}, ${day}::date, 1)
            ON CONFLICT (key, endpoint, day)
                DO UPDATE SET count = ai_usage.count + 1
                WHERE ai_usage.count < ${limits.perUser}
            RETURNING count
        ),
        g AS (
            INSERT INTO ai_usage (key, endpoint, day, count)
            SELECT ${GLOBAL_KEY}, ${endpoint}, ${day}::date, 1
            WHERE EXISTS (SELECT 1 FROM u)
            ON CONFLICT (key, endpoint, day)
                DO UPDATE SET count = ai_usage.count + 1
                WHERE ai_usage.count < ${limits.global}
            RETURNING count
        )
        SELECT (SELECT count FROM u) AS user_count, (SELECT count FROM g) AS global_count
    `);

    const row = result.rows[0];
    const userCount = row?.user_count == null ? null : Number(row.user_count);
    const globalCount = row?.global_count == null ? null : Number(row.global_count);

    if (userCount === null) {
        return { allowed: false, reason: "user", remaining: 0, day };
    }

    if (globalCount === null) {
        // The app is out for today: give the user their try back.
        await refundKeys([key], endpoint, day);
        return {
            allowed: false,
            reason: "global",
            remaining: Math.max(limits.perUser - (userCount - 1), 0),
            day,
        };
    }

    return { allowed: true, remaining: Math.max(limits.perUser - userCount, 0), day };
}

/** How many requests the user has left today (read only, one SELECT). */
export async function getDailyRemaining(userId: string, endpoint: string, perUser: number): Promise<number> {
    const result = await db.execute<{ count: number }>(sql`
        SELECT count FROM ai_usage
        WHERE key = ${userKey(userId)} AND endpoint = ${endpoint} AND day = ${utcDay()}::date
    `);
    const used = Number(result.rows[0]?.count ?? 0);
    return Math.max(perUser - used, 0);
}

/** Undo consumeDailyLimit (both counters), e.g. when the AI call failed. */
export async function refundDailyLimit(userId: string, endpoint: string, day: string): Promise<void> {
    await refundKeys([userKey(userId), GLOBAL_KEY], endpoint, day);
}

async function refundKeys(keys: string[], endpoint: string, day: string): Promise<void> {
    await db.execute(sql`
        UPDATE ai_usage
        SET count = count - 1
        WHERE key IN (${sql.join(keys.map((k) => sql`${k}`), sql`, `)})
          AND endpoint = ${endpoint}
          AND day = ${day}::date
          AND count > 0
    `);
}

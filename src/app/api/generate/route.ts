import { type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { LIMITS } from "@/lib/constants/limits";
import { ApiResponse } from "@/lib/utils/api-response";
import { consumeDailyLimit, refundDailyLimit } from "@/lib/utils/rate-limit";
import { AiBusyError, generateRecommendations } from "@/modules/generate/services/ai-service";
import { generateInputSchema } from "@/modules/generate/validations/generate-schema";

// Gemini times out after 15s (ai-service.ts); this leaves a margin.
export const maxDuration = 30;

// Per-user results: the CDN and the browser must never store them.
const NO_STORE = "private, no-store";

// A 500-character prompt is well under 2 KB of JSON.
const MAX_BODY_BYTES = 2048;

const ENDPOINT = "generate";
const DAILY_LIMITS = {
    perUser: LIMITS.FREE.AI_REQUESTS_PER_DAY,
    global: LIMITS.GLOBAL.AI_REQUESTS_PER_DAY,
};

function withHeaders(res: Response, remaining?: number): Response {
    res.headers.set("Cache-Control", NO_STORE);
    if (remaining !== undefined) res.headers.set("X-RateLimit-Remaining", String(remaining));
    return res;
}

/**
 * POST /api/generate  { prompt } → { recommendations, remaining }
 *
 * Order matters: the cheap checks (size, session, input) run before the
 * daily limit and the AI call. The proxy doesn't run on /api/*, so the
 * session check here is the real one; the user id comes only from it.
 * A failed AI call gives the user's try back (refund).
 */
export async function POST(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
        return withHeaders(ApiResponse.error("Request too large", 413));
    }

    const session = await getServerSession();
    if (!session) return withHeaders(ApiResponse.unauthorized());
    const userId = session.user.id;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return withHeaders(ApiResponse.badRequest("Invalid JSON"));
    }

    const parsed = generateInputSchema.safeParse(body);
    if (!parsed.success) {
        return withHeaders(
            ApiResponse.badRequest("Describe what you want to watch in 3 to 500 characters."),
        );
    }

    let limit: Awaited<ReturnType<typeof consumeDailyLimit>>;
    try {
        limit = await consumeDailyLimit(userId, ENDPOINT, DAILY_LIMITS);
    } catch (error) {
        console.error("POST /api/generate rate limit failed:", error);
        return withHeaders(ApiResponse.error("AI recommendations are unavailable right now.", 503));
    }

    if (!limit.allowed) {
        const message =
            limit.reason === "user"
                ? `You've used your ${DAILY_LIMITS.perUser} recommendations for today. They reset at midnight UTC.`
                : "The AI is busy today. Please try again tomorrow.";
        return withHeaders(ApiResponse.error(message, 429), limit.remaining);
    }

    try {
        const recommendations = await generateRecommendations(parsed.data.prompt);
        return withHeaders(
            ApiResponse.ok({ recommendations, remaining: limit.remaining }),
            limit.remaining,
        );
    } catch (error) {
        // The user didn't get an answer: give the try back.
        let remaining = limit.remaining;
        try {
            await refundDailyLimit(userId, ENDPOINT, limit.day);
            remaining += 1;
        } catch (refundError) {
            console.error("POST /api/generate refund failed:", refundError);
        }

        if (error instanceof AiBusyError) {
            return withHeaders(ApiResponse.error(error.message, 429), remaining);
        }
        console.error("POST /api/generate failed:", error);
        return withHeaders(
            ApiResponse.error("AI recommendations are unavailable right now.", 503),
            remaining,
        );
    }
}

import { type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { ApiResponse } from "@/lib/utils/api-response";
import { consumeDailyLimit, refundDailyLimit } from "@/lib/utils/rate-limit";
import { QUIZ_DAILY_LIMITS, QUIZ_ENDPOINT } from "@/modules/quiz/constants";
import { startQuiz } from "@/modules/quiz/services/quiz-service";
import { startQuizSchema } from "@/modules/quiz/validations/quiz-schema";

// On a cold data cache the pool takes 4 Tenrai calls (10s timeout each).
export const maxDuration = 30;

// Per-user game data: the CDN and the browser must never store it.
const NO_STORE = "private, no-store";
const MAX_BODY_BYTES = 512;

function noStore(res: Response): Response {
    res.headers.set("Cache-Control", NO_STORE);
    return res;
}

/**
 * POST /api/quiz/start  { mode, difficulty } → { sessionId, total, question }
 *
 * Cheap checks first (size, session, input), then the daily game cap. The
 * proxy doesn't run on /api/*, so this session check is the real one.
 * If the game can't be created, the user gets the try back.
 */
export async function POST(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
        return noStore(ApiResponse.error("Request too large", 413));
    }

    const session = await getServerSession();
    if (!session) return noStore(ApiResponse.unauthorized());
    const userId = session.user.id;

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return noStore(ApiResponse.badRequest("Invalid JSON"));
    }

    const parsed = startQuizSchema.safeParse(body);
    if (!parsed.success) {
        return noStore(ApiResponse.badRequest("Pick a quiz mode and a difficulty."));
    }

    let limit: Awaited<ReturnType<typeof consumeDailyLimit>>;
    try {
        limit = await consumeDailyLimit(userId, QUIZ_ENDPOINT, QUIZ_DAILY_LIMITS);
    } catch (error) {
        console.error("POST /api/quiz/start rate limit failed:", error);
        return noStore(ApiResponse.error("The quiz is unavailable right now.", 503));
    }

    if (!limit.allowed) {
        const message =
            limit.reason === "user"
                ? `You've played your ${QUIZ_DAILY_LIMITS.perUser} quizzes for today. They reset at midnight UTC.`
                : "The quiz is busy today. Please try again tomorrow.";
        return noStore(ApiResponse.error(message, 429));
    }

    try {
        const game = await startQuiz(userId, parsed.data.mode, parsed.data.difficulty);
        return noStore(ApiResponse.ok(game));
    } catch (error) {
        console.error("POST /api/quiz/start failed:", error);
        try {
            await refundDailyLimit(userId, QUIZ_ENDPOINT, limit.day);
        } catch (refundError) {
            console.error("POST /api/quiz/start refund failed:", refundError);
        }
        return noStore(ApiResponse.error("The quiz is unavailable right now. Please try again.", 503));
    }
}

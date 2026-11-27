import { type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { ApiResponse } from "@/lib/utils/api-response";
import { answerQuestion } from "@/modules/quiz/services/quiz-service";
import { answerQuizSchema } from "@/modules/quiz/validations/quiz-schema";

const NO_STORE = "private, no-store";
const MAX_BODY_BYTES = 512;

function noStore(res: Response): Response {
    res.headers.set("Cache-Control", NO_STORE);
    return res;
}

/**
 * POST /api/quiz/answer  { sessionId, index, optionId | null, skip? }
 *   → { correct, timedOut, skipped, correctId, score, streak, next, results }
 *
 * The answer is checked on the server (one UPDATE, see quiz-service.ts);
 * the browser never had the correct option before this. optionId null
 * means the timer ran out. A game can only be answered by its owner: the
 * user id comes from the session and is part of the UPDATE's WHERE.
 */
export async function POST(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
        return noStore(ApiResponse.error("Request too large", 413));
    }

    const session = await getServerSession();
    if (!session) return noStore(ApiResponse.unauthorized());

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return noStore(ApiResponse.badRequest("Invalid JSON"));
    }

    const parsed = answerQuizSchema.safeParse(body);
    if (!parsed.success) {
        return noStore(ApiResponse.badRequest("Invalid answer."));
    }

    const { sessionId, index, optionId, skip } = parsed.data;

    try {
        const result = await answerQuestion(session.user.id, sessionId, index, optionId, skip);
        if (!result) {
            return noStore(
                ApiResponse.conflict("This question was already answered or the game is over."),
            );
        }
        return noStore(ApiResponse.ok(result));
    } catch (error) {
        console.error("POST /api/quiz/answer failed:", error);
        return noStore(ApiResponse.error("Couldn't check your answer. Please try again.", 500));
    }
}

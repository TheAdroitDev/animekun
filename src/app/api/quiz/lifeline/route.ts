import { type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { ApiResponse } from "@/lib/utils/api-response";
import { applyLifeline } from "@/modules/quiz/services/quiz-service";
import { lifelineSchema } from "@/modules/quiz/validations/quiz-schema";

const NO_STORE = "private, no-store";
const MAX_BODY_BYTES = 512;

function noStore(res: Response): Response {
    res.headers.set("Cache-Control", NO_STORE);
    return res;
}

/**
 * POST /api/quiz/lifeline  { sessionId, index, type: "fifty" | "hint" }
 *   → { type: "fifty", removedIds } | { type: "hint", hint }
 *
 * Each lifeline once per game, checked on the server (one UPDATE). The
 * user id comes from the session. Skip goes through /api/quiz/answer.
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

    const parsed = lifelineSchema.safeParse(body);
    if (!parsed.success) {
        return noStore(ApiResponse.badRequest("Invalid lifeline."));
    }

    const { sessionId, index, type } = parsed.data;

    try {
        const result = await applyLifeline(session.user.id, sessionId, index, type);
        if (!result) {
            return noStore(ApiResponse.conflict("This lifeline isn't available right now."));
        }
        return noStore(ApiResponse.ok(result));
    } catch (error) {
        console.error("POST /api/quiz/lifeline failed:", error);
        return noStore(ApiResponse.error("Couldn't use the lifeline. Please try again.", 500));
    }
}

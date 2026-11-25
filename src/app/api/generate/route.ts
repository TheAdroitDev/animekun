import { type NextRequest } from "next/server";

import { getServerSession } from "@/lib/auth/session";
import { ApiResponse } from "@/lib/utils/api-response";
import { AiBusyError, generateRecommendations } from "@/modules/generate/services/ai-service";
import { generateInputSchema } from "@/modules/generate/validations/generate-schema";

// Gemini times out after 15s (ai-service.ts); this leaves a margin.
export const maxDuration = 30;

// Per-user results: the CDN and the browser must never store them.
const NO_STORE = "private, no-store";

// A 500-character prompt is well under 2 KB of JSON.
const MAX_BODY_BYTES = 2048;

function withNoStore(res: Response): Response {
    res.headers.set("Cache-Control", NO_STORE);
    return res;
}

/**
 * POST /api/generate  { prompt } → { recommendations: Recommendation[] }
 *
 * Order matters: the cheap checks (size, session, input) run before the
 * rate limit and the AI call. The proxy doesn't run on /api/*, so the
 * session check here is the real one; the user id comes only from it.
 */
export async function POST(request: NextRequest) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
        return withNoStore(ApiResponse.error("Request too large", 413));
    }

    const session = await getServerSession();
    if (!session) return withNoStore(ApiResponse.unauthorized());

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return withNoStore(ApiResponse.badRequest("Invalid JSON"));
    }

    const parsed = generateInputSchema.safeParse(body);
    if (!parsed.success) {
        return withNoStore(
            ApiResponse.badRequest("Describe what you want to watch in 3 to 500 characters."),
        );
    }

    // TODO(8.3): daily rate limit for session.user.id goes here.

    try {
        const recommendations = await generateRecommendations(parsed.data.prompt);
        return ApiResponse.ok({ recommendations }, undefined, { "Cache-Control": NO_STORE });
    } catch (error) {
        if (error instanceof AiBusyError) {
            return withNoStore(ApiResponse.error(error.message, 429));
        }
        console.error("POST /api/generate failed:", error);
        return withNoStore(
            ApiResponse.error("AI recommendations are unavailable right now.", 503),
        );
    }
}

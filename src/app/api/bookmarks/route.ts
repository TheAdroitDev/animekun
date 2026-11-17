import { getServerSession } from "@/lib/auth/session";
import { ApiResponse } from "@/lib/utils/api-response";
import { getBookmarkStatusMap } from "@/modules/bookmarks/services/bookmark-service";

// Per-user data: the CDN and the browser must never store it.
const PRIVATE = { "Cache-Control": "private, no-store" };

/**
 * GET /api/bookmarks → the signed-in user's { animeId: status } map.
 * Only called when useSession() has a user, so logged-out visitors never
 * hit it. Reading the session makes this route dynamic.
 */
export async function GET() {
    const session = await getServerSession();
    if (!session) {
        const res = ApiResponse.unauthorized();
        res.headers.set("Cache-Control", PRIVATE["Cache-Control"]);
        return res;
    }

    try {
        const map = await getBookmarkStatusMap(session.user.id);
        return ApiResponse.ok(map, undefined, PRIVATE);
    } catch (error) {
        console.error("GET /api/bookmarks failed:", error);
        const res = ApiResponse.error("Failed to load bookmarks", 500);
        res.headers.set("Cache-Control", PRIVATE["Cache-Control"]);
        return res;
    }
}

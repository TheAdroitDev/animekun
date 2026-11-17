"use server";

import { getServerSession } from "@/lib/auth/session";

import { upsertBookmark } from "../services/bookmark-service";
import type { ActionResult, Bookmark } from "../types";
import { setBookmarkStatusSchema } from "../validations/bookmark-schema";

/**
 * Add a bookmark or move it to another status.
 * Checklist: validate → session → user id from the session → scoped service call.
 *
 * No revalidatePath on purpose: any revalidation makes Next re-render the
 * CURRENT page inside the action response (server work on every click,
 * even on the static /anime/[id]). /bookmarks is dynamic and the router
 * never caches it (staleTimes.dynamic = 0), so it's always fresh anyway.
 */
export async function setBookmarkStatusAction(input: unknown): Promise<ActionResult<Bookmark>> {
    const parsed = setBookmarkStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const session = await getServerSession();
    if (!session) return { ok: false, error: "unauthorized" };

    try {
        const bookmark = await upsertBookmark(session.user.id, parsed.data);
        if (!bookmark) return { ok: false, error: "limit" };
        return { ok: true, data: bookmark };
    } catch (error) {
        console.error("setBookmarkStatusAction failed:", error);
        return { ok: false, error: "server" };
    }
}

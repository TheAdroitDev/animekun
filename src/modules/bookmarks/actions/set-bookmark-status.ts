"use server";

import { revalidatePath } from "next/cache";

import { getServerSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/route";

import { upsertBookmark } from "../services/bookmark-service";
import type { ActionResult, Bookmark } from "../types";
import { setBookmarkStatusSchema } from "../validations/bookmark-schema";

/**
 * Add a bookmark or move it to another status.
 * Checklist: validate → session → user id from the session → scoped service call → revalidate.
 */
export async function setBookmarkStatusAction(input: unknown): Promise<ActionResult<Bookmark>> {
    const parsed = setBookmarkStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const session = await getServerSession();
    if (!session) return { ok: false, error: "unauthorized" };

    try {
        const bookmark = await upsertBookmark(session.user.id, parsed.data);
        if (!bookmark) return { ok: false, error: "limit" };

        revalidatePath(ROUTES.DASHBOARD.BOOKMARKS);
        return { ok: true, data: bookmark };
    } catch (error) {
        console.error("setBookmarkStatusAction failed:", error);
        return { ok: false, error: "server" };
    }
}

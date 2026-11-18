"use server";

import { getServerSession } from "@/lib/auth/session";

import { moveBookmark, reorderColumn } from "../services/bookmark-service";
import type { ActionResult, Bookmark } from "../types";
import { moveBookmarkSchema, reorderColumnSchema } from "../validations/bookmark-schema";

/**
 * Board drag and drop: put a card in a column at a position (reorder or
 * move). Checklist: validate → session → user id from the session →
 * scoped single-statement service call. No revalidatePath (see
 * set-bookmark-status.ts).
 */
export async function moveBookmarkAction(input: unknown): Promise<ActionResult<Bookmark>> {
    const parsed = moveBookmarkSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const session = await getServerSession();
    if (!session) return { ok: false, error: "unauthorized" };

    try {
        const bookmark = await moveBookmark(session.user.id, parsed.data);
        if (!bookmark) return { ok: false, error: "invalid" }; // it no longer exists
        return { ok: true, data: bookmark };
    } catch (error) {
        console.error("moveBookmarkAction failed:", error);
        return { ok: false, error: "server" };
    }
}

/** Rare: renumber a column (it ran out of room between two cards). */
export async function reorderColumnAction(input: unknown): Promise<ActionResult> {
    const parsed = reorderColumnSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const session = await getServerSession();
    if (!session) return { ok: false, error: "unauthorized" };

    try {
        await reorderColumn(session.user.id, parsed.data.status, parsed.data.animeIds);
        return { ok: true, data: undefined };
    } catch (error) {
        console.error("reorderColumnAction failed:", error);
        return { ok: false, error: "server" };
    }
}

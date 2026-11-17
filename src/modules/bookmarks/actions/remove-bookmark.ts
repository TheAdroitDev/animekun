"use server";

import { getServerSession } from "@/lib/auth/session";

import { removeBookmark } from "../services/bookmark-service";
import type { ActionResult } from "../types";
import { removeBookmarkSchema } from "../validations/bookmark-schema";

/**
 * Remove a bookmark. Removing one that is already gone counts as success,
 * so a double click is not an error.
 *
 * No revalidatePath on purpose (see set-bookmark-status.ts).
 */
export async function removeBookmarkAction(input: unknown): Promise<ActionResult> {
    const parsed = removeBookmarkSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "invalid" };

    const session = await getServerSession();
    if (!session) return { ok: false, error: "unauthorized" };

    try {
        await removeBookmark(session.user.id, parsed.data.animeId);
        return { ok: true, data: undefined };
    } catch (error) {
        console.error("removeBookmarkAction failed:", error);
        return { ok: false, error: "server" };
    }
}

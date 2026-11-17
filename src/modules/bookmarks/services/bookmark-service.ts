import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { LIMITS } from "@/lib/constants/limits";

import type { Bookmark, BookmarkStatus, BookmarkStatusMap } from "../types";
import type { SetBookmarkStatusInput } from "../validations/bookmark-schema";

/**
 * Bookmark queries (server only). Every function:
 * - takes the user id from the caller's server-side session, never from the client;
 * - scopes every query by that user id;
 * - runs exactly one SQL statement (neon-http has no transactions).
 */

const bookmarkFields = {
    animeId: bookmarks.animeId,
    status: bookmarks.status,
    title: bookmarks.title,
    posterUrl: bookmarks.posterUrl,
    updatedAt: bookmarks.updatedAt,
};

/** All of a user's bookmarks, newest change first. */
export async function getUserBookmarks(userId: string): Promise<Bookmark[]> {
    return db
        .select(bookmarkFields)
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(desc(bookmarks.updatedAt));
}

/**
 * animeId → status for every bookmark of a user. Selects only those two
 * columns (no titles or poster URLs): this feeds the bookmark button.
 */
export async function getBookmarkStatusMap(userId: string): Promise<BookmarkStatusMap> {
    const rows = await db
        .select({ animeId: bookmarks.animeId, status: bookmarks.status })
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId));
    return Object.fromEntries(rows.map((r) => [r.animeId, r.status]));
}

// A type alias (not an interface) so it satisfies db.execute's Record constraint.
type BookmarkRow = {
    animeId: string;
    status: BookmarkStatus;
    title: string;
    posterUrl: string | null;
    updatedAt: Date | string;
};

/**
 * Add a bookmark, or move it to another status if it already exists.
 *
 * One statement: the WHERE clause enforces the per-user cap, and lets a
 * user who is at the cap still move bookmarks they already have. The
 * unique (user_id, anime_id) index makes duplicates impossible, even with
 * two fast clicks.
 *
 * Returns the saved bookmark, or null when the user is at the cap.
 */
export async function upsertBookmark(
    userId: string,
    input: SetBookmarkStatusInput,
): Promise<Bookmark | null> {
    const { animeId, status, title, posterUrl } = input;
    const max = LIMITS.FREE.BOOKMARKS_PER_USER;

    // Raw SQL with an explicit column list: Drizzle's insert().select()
    // needs every table column in table order, which breaks when a column
    // is added. Casts are needed because untyped params arrive as text.
    const result = await db.execute<BookmarkRow>(sql`
        INSERT INTO bookmarks (user_id, anime_id, status, title, poster_url)
        SELECT ${userId}::uuid, ${animeId}, ${status}::bookmark_status, ${title}, ${posterUrl}
        WHERE (SELECT count(*) FROM bookmarks WHERE user_id = ${userId}::uuid) < ${max}
           OR EXISTS (
                SELECT 1 FROM bookmarks
                WHERE user_id = ${userId}::uuid AND anime_id = ${animeId}
           )
        ON CONFLICT (user_id, anime_id) DO UPDATE
            SET status = excluded.status, updated_at = now()
        RETURNING
            anime_id   AS "animeId",
            status,
            title,
            poster_url AS "posterUrl",
            updated_at AS "updatedAt"
    `);

    const row = result.rows[0];
    if (!row) return null;
    return { ...row, updatedAt: new Date(row.updatedAt) };
}

/** Remove one bookmark. Returns false when there was nothing to remove. */
export async function removeBookmark(userId: string, animeId: string): Promise<boolean> {
    const deleted = await db
        .delete(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.animeId, animeId)))
        .returning({ animeId: bookmarks.animeId });
    return deleted.length > 0;
}

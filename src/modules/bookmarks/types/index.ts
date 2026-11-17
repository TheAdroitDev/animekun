// The 5 Kanban columns, in board order. Plain constant (no Drizzle import),
// so client components can use it; db/schema/bookmarks.ts builds the
// Postgres enum from this same list.
export const BOOKMARK_STATUSES = [
    "watching",
    "completed",
    "plan_to_watch",
    "on_hold",
    "dropped",
] as const;

export type BookmarkStatus = (typeof BOOKMARK_STATUSES)[number];

// A bookmark as the UI sees it (no row id or user id).
export interface Bookmark {
    animeId: string;
    status: BookmarkStatus;
    title: string;
    posterUrl: string | null;
    updatedAt: Date;
}

// One column of the board.
export interface BoardColumn {
    status: BookmarkStatus;
    bookmarks: Bookmark[];
}

// What GET /api/bookmarks returns: animeId → status.
export type BookmarkStatusMap = Record<string, BookmarkStatus>;

// Server Actions return a code instead of throwing: in production Next hides
// thrown messages, and the UI needs the reason to roll back with a message.
export type ActionError = "invalid" | "unauthorized" | "limit" | "server";

export type ActionResult<T = undefined> =
    | { ok: true; data: T }
    | { ok: false; error: ActionError };

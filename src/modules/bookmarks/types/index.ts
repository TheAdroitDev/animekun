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

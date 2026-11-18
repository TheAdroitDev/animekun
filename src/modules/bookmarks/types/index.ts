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

// Display names (bookmark menu, board columns).
export const BOOKMARK_STATUS_LABELS: Record<BookmarkStatus, string> = {
    watching: "Watching",
    completed: "Completed",
    plan_to_watch: "Plan to Watch",
    on_hold: "On Hold",
    dropped: "Dropped",
};
// Spacing between card positions in a column, so a drop between two cards
// is one UPDATE (the midpoint). Shared by the board and the service.
export const POSITION_GAP = 1024;

// A bookmark as the UI sees it (no row id or user id).
export interface Bookmark {
    animeId: string;
    status: BookmarkStatus;
    title: string;
    posterUrl: string | null;
    // Order inside its column: lower first (gapped by 1024; ties: newest first).
    position: number;
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

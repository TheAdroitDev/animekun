// Client-safe exports only. The service (services/bookmark-service.ts) is
// server-only: import it directly from server code, never through here.
export { BOOKMARK_STATUSES } from "./types";
export type {
    ActionError,
    ActionResult,
    BoardColumn,
    Bookmark,
    BookmarkStatus,
    BookmarkStatusMap,
} from "./types";

export { setBookmarkStatusAction } from "./actions/set-bookmark-status";
export { removeBookmarkAction } from "./actions/remove-bookmark";

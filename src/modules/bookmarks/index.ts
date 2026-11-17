// Client-safe exports only. The service (services/bookmark-service.ts) is
// server-only: import it directly from server code, never through here.
export { BOOKMARK_STATUSES, BOOKMARK_STATUS_LABELS } from "./types";
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

export { BookmarkErrorMessage } from "./components/BookmarkErrorMessage";

export {
    BookmarkActionError,
    useBookmarkStatuses,
    useRemoveBookmark,
    useSetBookmarkStatus,
} from "./queries/use-bookmarks";

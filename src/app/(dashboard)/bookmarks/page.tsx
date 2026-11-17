import type { Metadata } from "next";
import Link from "next/link";

import { requireSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/route";
import { KanbanBoard } from "@/modules/bookmarks/components/KanbanBoard";
import { getUserBookmarks } from "@/modules/bookmarks/services/bookmark-service";

// Private page: dynamic (reads the session), never indexed.
export const metadata: Metadata = {
    title: "My Bookmarks | AnimeKun",
    robots: { index: false, follow: false },
};

export default async function BookmarksPage() {
    // The real check (the proxy only looks for a cookie). User id from the session.
    const session = await requireSession(ROUTES.DASHBOARD.BOOKMARKS);
    const bookmarks = await getUserBookmarks(session.user.id);

    return (
        <div className="bookmarks-page">
            <header className="bookmarks-page-header">
                <h1 className="bookmarks-page-title">My Watchlist</h1>
                <p className="bookmarks-page-count">
                    {bookmarks.length} anime
                </p>
            </header>

            {bookmarks.length === 0 ? (
                <div className="bookmarks-page-empty">
                    <p>Your watchlist is empty. Browse anime and add some!</p>
                    <Link href={ROUTES.SEARCH} className="bookmarks-page-empty-link">
                        Browse anime
                    </Link>
                </div>
            ) : (
                <KanbanBoard initialBookmarks={bookmarks} />
            )}
        </div>
    );
}

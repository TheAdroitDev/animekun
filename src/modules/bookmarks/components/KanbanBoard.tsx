"use client";

import { useMemo, useState } from "react";

import { ROUTES } from "@/lib/constants/route";

import { BookmarkActionError, useRemoveBookmark, useSetBookmarkStatus } from "../queries/use-bookmarks";
import {
    BOOKMARK_STATUSES,
    type ActionError,
    type BoardColumn,
    type Bookmark,
    type BookmarkStatus,
} from "../types";
import { BookmarkErrorMessage } from "./BookmarkErrorMessage";
import { KanbanColumn } from "./KanbanColumn";

const LOGIN_HREF = `${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(ROUTES.DASHBOARD.BOOKMARKS)}`;

interface KanbanBoardProps {
    // Loaded on the server by the /bookmarks page.
    initialBookmarks: Bookmark[];
}

/**
 * The 5-column board. Owns the list: moves and removes update it instantly,
 * and a failed save puts back only that one card (so it never undoes another
 * card's move that is still saving). The mutation hooks also keep the
 * status map used by the anime pages' bookmark button in sync.
 *
 * mutateAsync (not mutate + callbacks): TanStack only fires per-call
 * callbacks for the LAST mutate call, and several cards can be saving at once.
 */
export function KanbanBoard({ initialBookmarks }: KanbanBoardProps) {
    const [items, setItems] = useState(initialBookmarks);
    const [error, setError] = useState<ActionError | null>(null);
    const setStatus = useSetBookmarkStatus();
    const remove = useRemoveBookmark();

    const columns = useMemo<BoardColumn[]>(
        () =>
            BOOKMARK_STATUSES.map((status) => ({
                status,
                bookmarks: items
                    .filter((b) => b.status === status)
                    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
            })),
        [items],
    );

    // Replace a card only if it still has the status we expect: a newer move
    // of the same card wins over an older save finishing late.
    const replaceIf = (animeId: string, ifStatus: BookmarkStatus, next: Bookmark) =>
        setItems((cur) => cur.map((b) => (b.animeId === animeId && b.status === ifStatus ? next : b)));

    const showError = (e: unknown) => setError(e instanceof BookmarkActionError ? e.code : "server");

    async function handleMove(animeId: string, status: BookmarkStatus) {
        const before = items.find((b) => b.animeId === animeId);
        if (!before || before.status === status) return;

        setError(null);
        replaceIf(animeId, before.status, { ...before, status, updatedAt: new Date() });

        try {
            const saved = await setStatus.mutateAsync({
                animeId,
                status,
                title: before.title,
                posterUrl: before.posterUrl,
            });
            replaceIf(animeId, status, saved);
        } catch (e) {
            replaceIf(animeId, status, before);
            showError(e);
        }
    }

    async function handleRemove(animeId: string) {
        const before = items.find((b) => b.animeId === animeId);
        if (!before) return;

        setError(null);
        setItems((cur) => cur.filter((b) => b.animeId !== animeId));

        try {
            await remove.mutateAsync({ animeId });
        } catch (e) {
            setItems((cur) => (cur.some((b) => b.animeId === animeId) ? cur : [...cur, before]));
            showError(e);
        }
    }

    return (
        <div className="kanban">
            {error && <BookmarkErrorMessage error={error} loginHref={LOGIN_HREF} className="kanban-board-error" />}

            <div className="kanban-board">
                {columns.map((column) => (
                    <KanbanColumn
                        key={column.status}
                        column={column}
                        onMove={handleMove}
                        onRemove={handleRemove}
                    />
                ))}
            </div>
        </div>
    );
}

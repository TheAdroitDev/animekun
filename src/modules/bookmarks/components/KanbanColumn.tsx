"use client";

import { useState } from "react";

import { BOOKMARK_STATUS_LABELS, type BoardColumn, type BookmarkStatus } from "../types";
import { BookmarkCard } from "./BookmarkCard";

// Cards rendered per "page" of a column (up to 2000 bookmarks per user).
const PAGE_SIZE = 50;

interface KanbanColumnProps {
    column: BoardColumn;
    onMove: (animeId: string, status: BookmarkStatus) => void;
    onRemove: (animeId: string) => void;
}

/** One status column. Shows cards in the order the board passes them. */
export function KanbanColumn({ column, onMove, onRemove }: KanbanColumnProps) {
    const { status, bookmarks } = column;
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const headingId = `kanban-column-${status}`;
    const visible = bookmarks.slice(0, visibleCount);
    const remaining = bookmarks.length - visible.length;

    return (
        <section className="kanban-column" aria-labelledby={headingId}>
            <header className="kanban-column-header">
                <h2 id={headingId} className="kanban-column-title">
                    {BOOKMARK_STATUS_LABELS[status]}
                </h2>
                <span className="kanban-column-count" aria-label={`${bookmarks.length} anime`}>
                    {bookmarks.length}
                </span>
            </header>

            {bookmarks.length === 0 ? (
                <p className="kanban-column-empty">Nothing here yet</p>
            ) : (
                <ul className="kanban-column-list">
                    {visible.map((bookmark) => (
                        <li key={bookmark.animeId}>
                            <BookmarkCard
                                bookmark={bookmark}
                                onMove={(next) => onMove(bookmark.animeId, next)}
                                onRemove={() => onRemove(bookmark.animeId)}
                            />
                        </li>
                    ))}
                </ul>
            )}

            {remaining > 0 && (
                <button
                    type="button"
                    className="kanban-column-more"
                    onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                    Show more ({remaining} left)
                </button>
            )}
        </section>
    );
}

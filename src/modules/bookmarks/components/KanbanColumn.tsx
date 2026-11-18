"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";

import { BOOKMARK_STATUS_KANJI, BOOKMARK_STATUS_LABELS, type BoardColumn, type BookmarkStatus } from "../types";
import { BookmarkCard } from "./BookmarkCard";
import { BumpCount } from "./BumpCount";

// Cards rendered per "page" of a column (up to 2000 bookmarks per user).
const PAGE_SIZE = 50;

interface KanbanColumnProps {
    column: BoardColumn;
    // Cards playing their remove animation (still rendered for ~180ms).
    leavingIds: ReadonlySet<string>;
    onMove: (animeId: string, status: BookmarkStatus) => void;
    onRemove: (animeId: string) => void;
}

/**
 * One status column and drop target (the droppable id is the status).
 * On phones the columns stack and each one can be collapsed; a collapsed
 * column still accepts drops on its header.
 */
export function KanbanColumn({ column, leavingIds, onMove, onRemove }: KanbanColumnProps) {
    const { status, bookmarks } = column;
    const label = BOOKMARK_STATUS_LABELS[status];
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [collapsed, setCollapsed] = useState(false);
    const headingId = `kanban-column-${status}`;
    const bodyId = `kanban-column-body-${status}`;
    const visible = bookmarks.slice(0, visibleCount);
    const remaining = bookmarks.length - visible.length;

    const { setNodeRef, isOver, active } = useDroppable({ id: status });
    // Only highlight a column the card can actually move to.
    const isDropTarget = isOver && active?.data.current?.status !== status;

    const className = ["kanban-column", isDropTarget && "is-drop-target", collapsed && "is-collapsed"]
        .filter(Boolean)
        .join(" ");

    return (
        // data-status sets the column's colour (--status-color in globals.css).
        <section ref={setNodeRef} className={className} data-status={status} aria-labelledby={headingId}>
            <span className="kanban-column-kanji" aria-hidden="true">
                {BOOKMARK_STATUS_KANJI[status]}
            </span>
            <header className="kanban-column-header">
                <span className="kanban-dot" aria-hidden="true" />
                <h2 id={headingId} className="kanban-column-title">
                    {label}
                </h2>
                <BumpCount
                    value={bookmarks.length}
                    className="kanban-column-count"
                    aria-label={`${bookmarks.length} anime`}
                />
                {/* Phones only (hidden by CSS on wider screens). */}
                <button
                    type="button"
                    className="kanban-column-toggle"
                    aria-expanded={!collapsed}
                    aria-controls={bodyId}
                    aria-label={`${collapsed ? "Expand" : "Collapse"} ${label}`}
                    onClick={() => setCollapsed((c) => !c)}
                >
                    <ChevronDown size={16} aria-hidden="true" />
                </button>
            </header>

            <div id={bodyId} className="kanban-column-body">
                {bookmarks.length === 0 ? (
                    // One hint per input type; CSS shows the right one.
                    <p className="kanban-column-empty">
                        <span className="kanban-hint-pointer">Drag anime here</span>
                        <span className="kanban-hint-touch">Nothing here yet</span>
                    </p>
                ) : (
                    <ul className="kanban-column-list">
                        {visible.map((bookmark) => (
                            <li
                                key={bookmark.animeId}
                                className={leavingIds.has(bookmark.animeId) ? "is-leaving" : undefined}
                            >
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
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown } from "lucide-react";

import { BOOKMARK_STATUS_LABELS, type BoardColumn, type BookmarkStatus } from "../types";
import { BookmarkCard } from "./BookmarkCard";

// Cards rendered per "page" of a column (up to 2000 bookmarks per user).
const PAGE_SIZE = 50;

interface KanbanColumnProps {
    column: BoardColumn;
    onMove: (animeId: string, status: BookmarkStatus) => void;
    onRemove: (animeId: string) => void;
}

/**
 * One status column and drop target (the droppable id is the status).
 * On phones the columns stack and each one can be collapsed; a collapsed
 * column still accepts drops on its header.
 */
export function KanbanColumn({ column, onMove, onRemove }: KanbanColumnProps) {
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
        <section ref={setNodeRef} className={className} aria-labelledby={headingId}>
            <header className="kanban-column-header">
                <h2 id={headingId} className="kanban-column-title">
                    {label}
                </h2>
                <span className="kanban-column-count" aria-label={`${bookmarks.length} anime`}>
                    {bookmarks.length}
                </span>
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
            </div>
        </section>
    );
}

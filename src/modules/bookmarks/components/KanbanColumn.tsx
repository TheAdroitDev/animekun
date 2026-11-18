"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown } from "lucide-react";

import { BOOKMARK_STATUS_LABELS, type BoardColumn } from "../types";
import { BookmarkCard } from "./BookmarkCard";
import { BumpCount } from "./BumpCount";

// Cards rendered per "page" of a column (up to 2000 bookmarks per user).
const PAGE_SIZE = 50;

interface KanbanColumnProps {
    column: BoardColumn;
    // Cards playing their remove animation (still rendered for ~180ms).
    leavingIds: ReadonlySet<string>;
    // Cards put back by Undo, hidden while the topping flies home.
    returningIds: ReadonlySet<string>;
    // A card from another column is being dragged into this one.
    isDropTarget: boolean;
    onRemove: (animeId: string) => void;
}

/**
 * One status column: a sortable list (cards slide apart to open a gap where
 * the dragged card will land; that gap shows the faint card itself) and a
 * drop target for empty space and empty columns (droppable id = status).
 * On phones the columns stack and each one can be collapsed; a collapsed
 * column still accepts drops on its header.
 */
export function KanbanColumn({ column, leavingIds, returningIds, isDropTarget, onRemove }: KanbanColumnProps) {
    const { status, bookmarks } = column;
    const label = BOOKMARK_STATUS_LABELS[status];
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [collapsed, setCollapsed] = useState(false);
    const headingId = `kanban-column-${status}`;
    const bodyId = `kanban-column-body-${status}`;
    const visible = bookmarks.slice(0, visibleCount);
    const remaining = bookmarks.length - visible.length;

    const { setNodeRef } = useDroppable({ id: status, data: { type: "column" } });

    const className = ["kanban-column", isDropTarget && "is-drop-target", collapsed && "is-collapsed"]
        .filter(Boolean)
        .join(" ");

    return (
        // data-status sets the column's colour (--status-color in globals.css).
        <section ref={setNodeRef} className={className} data-status={status} aria-labelledby={headingId}>
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
                    <SortableContext items={visible.map((b) => b.animeId)} strategy={verticalListSortingStrategy}>
                        <ul className="kanban-column-list">
                            {visible.map((bookmark) => (
                                <li
                                    key={bookmark.animeId}
                                    className={
                                        leavingIds.has(bookmark.animeId)
                                            ? "is-leaving"
                                            : returningIds.has(bookmark.animeId)
                                              ? "is-returning"
                                              : undefined
                                    }
                                >
                                    <BookmarkCard
                                        bookmark={bookmark}
                                        onRemove={() => onRemove(bookmark.animeId)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </SortableContext>
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

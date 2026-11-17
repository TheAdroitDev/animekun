"use client";

import { useMemo, useState } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
    type Announcements,
    type CollisionDetection,
    type DragEndEvent,
    type KeyboardCoordinateGetter,
    type UniqueIdentifier,
} from "@dnd-kit/core";

import { ROUTES } from "@/lib/constants/route";

import { BookmarkActionError, useRemoveBookmark, useSetBookmarkStatus } from "../queries/use-bookmarks";
import {
    BOOKMARK_STATUSES,
    BOOKMARK_STATUS_LABELS,
    type ActionError,
    type BoardColumn,
    type Bookmark,
    type BookmarkStatus,
} from "../types";
import { BookmarkCardPreview } from "./BookmarkCard";
import { BookmarkErrorMessage } from "./BookmarkErrorMessage";
import { KanbanColumn } from "./KanbanColumn";

const LOGIN_HREF = `${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(ROUTES.DASHBOARD.BOOKMARKS)}`;

// ── Drag and drop (@dnd-kit/core) ─────────────────────────────────────────

// Mouse/touch: the column under the pointer. Keyboard (no pointer): the
// column the moved card overlaps.
const collisionDetection: CollisionDetection = (args) =>
    args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);

// Keyboard: arrow keys jump one whole column (left/right on desktop,
// up/down when the columns are stacked on phones).
const KEY_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

const columnKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
    const step = KEY_STEP[event.code];
    if (!step) return undefined;
    event.preventDefault();

    const { over, active, droppableRects, collisionRect } = context;
    const fromId = (over?.id ?? active?.data.current?.status) as BookmarkStatus | undefined;
    const from = fromId ? BOOKMARK_STATUSES.indexOf(fromId) : -1;
    const to = Math.min(Math.max(from + step, 0), BOOKMARK_STATUSES.length - 1);
    const rect = droppableRects.get(BOOKMARK_STATUSES[to]);
    if (!rect || !collisionRect) return currentCoordinates;

    // Centre the card horizontally in the target column, just under its header.
    return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 48 };
};

const titleOf = (active: { data: { current?: Record<string, unknown> } }) =>
    String(active.data.current?.title ?? "Anime");
const labelOf = (id: UniqueIdentifier) => BOOKMARK_STATUS_LABELS[id as BookmarkStatus] ?? String(id);

// Screen reader messages (dnd-kit reads them in a live region).
const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active)}.`,
    onDragOver: ({ active, over }) =>
        over ? `${titleOf(active)} is over ${labelOf(over.id)}.` : `${titleOf(active)} is not over a list.`,
    onDragEnd: ({ active, over }) =>
        over ? `${titleOf(active)} dropped in ${labelOf(over.id)}.` : `${titleOf(active)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active)} was cancelled.`,
};

const screenReaderInstructions = {
    draggable:
        "To move this anime, press space or enter. Use the arrow keys to choose a list, " +
        "then press space or enter to drop it there, or escape to cancel.",
};

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
 *
 * Drag and drop: @dnd-kit/core with pointer (mouse + touch) and keyboard
 * sensors. Only this page loads it.
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

    // ── Drag and drop: a drop is just another move (same optimistic path).
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeBookmark = activeId ? items.find((b) => b.animeId === activeId) : undefined;

    const sensors = useSensors(
        // 4px before a drag starts, so clicking the handle doesn't "drag".
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        setActiveId(null);
        if (over) void handleMove(String(active.id), over.id as BookmarkStatus);
    }

    return (
        <div className="kanban">
            {error && <BookmarkErrorMessage error={error} loginHref={LOGIN_HREF} className="kanban-board-error" />}

            <DndContext
                id="bookmarks-board" // stable ids for SSR (no hydration mismatch)
                sensors={sensors}
                collisionDetection={collisionDetection}
                accessibility={{ announcements, screenReaderInstructions }}
                onDragStart={({ active }) => setActiveId(String(active.id))}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
            >
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

                {/* The copy that follows the pointer/finger. */}
                <DragOverlay>
                    {activeBookmark ? <BookmarkCardPreview bookmark={activeBookmark} /> : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

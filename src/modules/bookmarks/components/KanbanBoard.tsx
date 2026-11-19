"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
    type Announcements,
    type CollisionDetection,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    type KeyboardCoordinateGetter,
    type PointerSensorProps,
    type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { ROUTES } from "@/lib/constants/route";

import {
    BookmarkActionError,
    useMoveBookmark,
    useRemoveBookmark,
    useReorderColumn,
    useSetBookmarkStatus,
} from "../queries/use-bookmarks";
import {
    BOOKMARK_STATUSES,
    BOOKMARK_STATUS_LABELS,
    POSITION_GAP,
    type ActionError,
    type BoardColumn,
    type Bookmark,
    type BookmarkStatus,
} from "../types";
import {
    POP_OUT_MS,
    popFromBin,
    prefersReducedMotion,
    randomTopping,
    tossToBin,
    type Topping,
} from "../utils/toss";
import { BookmarkCardPreview } from "./BookmarkCard";
import { BookmarkErrorMessage } from "./BookmarkErrorMessage";
import { BumpCount } from "./BumpCount";
import { KanbanColumn } from "./KanbanColumn";
import { ToastStack } from "./ToastStack";
import { TossBin, type TossBinHandle } from "./TossBin";

const LOGIN_HREF = `${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(ROUTES.DASHBOARD.BOOKMARKS)}`;

// Must match the .is-leaving transition in globals.css.
const EXIT_MS = 180;
// Toast shows a beat after the ball lands (paper-toss: 340ms).
const TOAST_DELAY_MS = 340;
// Must match the .stack-toast.is-leaving transition in globals.css.
const TOAST_EXIT_MS = 220;
// Bring back all: toppings pop out of the bowl one after another.
const RESTORE_STAGGER_MS = 120;

/** An anime in the bowl (removed this visit) and the topping it became. */
interface Removed {
    bookmark: Bookmark;
    topping: Topping; // Undo brings back the same one
}

type NewToast = { focus: boolean } & (({ kind: "removed" } & Removed) | { kind: "info"; text: string });
type BoardToast = NewToast & { key: number; leaving?: boolean; frozenIndex?: number };

/** "Now", nudged by i ms: restored cards keep a stable order at the top. */
const stampAfter = (i: number) => new Date(Date.now() + i);

const toggled = (set: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
};

/** The visible card element for an anime (null if hidden, e.g. collapsed column). */
function findCard(animeId: string): HTMLElement | null {
    const el = document.querySelector<HTMLElement>(`[data-bookmark-id="${CSS.escape(animeId)}"]`);
    return el && el.getClientRects().length > 0 ? el : null;
}

// ── Drag and drop (@dnd-kit/core) ─────────────────────────────────────────

/**
 * Touch: a long-press anywhere on the card starts a drag (so a swipe still
 * scrolls the page), but a touch on the grip starts it instantly. One
 * sensor with a per-touch constraint, because two touch sensors would
 * fight over the same onTouchStart listener.
 */
class CardTouchSensor extends TouchSensor {
    constructor(props: PointerSensorProps) {
        const target = props.event.target;
        const onGrip = target instanceof Element && target.closest(".bookmark-card-handle") !== null;
        super(onGrip ? { ...props, options: { ...props.options, activationConstraint: undefined } } : props);
    }
}

// ── Order inside a column ─────────────────────────────────────────────────

/** A column's cards in board order: position ascending, ties newest first. */
function sortColumn(items: Bookmark[], status: BookmarkStatus): Bookmark[] {
    return items
        .filter((b) => b.status === status)
        .sort((a, b) => a.position - b.position || b.updatedAt.getTime() - a.updatedAt.getTime());
}

/**
 * Position for a card dropped at `index` among `others` (its column without
 * it): the midpoint of its neighbours, or a gap above/below the ends.
 * `renumber` means the neighbours are too close (e.g. old rows, all 0): the
 * column has to be renumbered 0, GAP, 2·GAP, …
 */
function positionAt(others: Bookmark[], index: number): { position: number; renumber: boolean } {
    const prev = others[index - 1];
    const next = others[index];
    if (!prev && !next) return { position: 0, renumber: false };
    if (!prev) return { position: next.position - POSITION_GAP, renumber: false };
    if (!next) return { position: prev.position + POSITION_GAP, renumber: false };
    if (next.position - prev.position < 2) return { position: prev.position, renumber: true };
    return { position: Math.floor((prev.position + next.position) / 2), renumber: false };
}

/** New positions (index · GAP) for a column in the given order. */
const renumbered = (list: Bookmark[]) => new Map(list.map((b, i) => [b.animeId, i * POSITION_GAP]));

const withPositions = (items: Bookmark[], positions: Map<string, number>) =>
    items.map((b) => (positions.has(b.animeId) ? { ...b, position: positions.get(b.animeId)! } : b));

// ── Collision: which card / column the dragged card is over ───────────────

type Typed = { type?: string; status?: string } | undefined;
const typeOf = (data: unknown) => (data as Typed)?.type;

const collisionDetection: CollisionDetection = (args) => {
    // Mouse/touch: what's under the pointer. Keyboard: what the card overlaps.
    const hits = args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
    const card = hits.find((h) => typeOf(h.data?.droppableContainer?.data.current) === "card");
    if (card) return [card];
    const column = hits.find((h) => typeOf(h.data?.droppableContainer?.data.current) === "column");
    if (!column) return hits;
    // In a gap between cards: snap to the nearest card of that column.
    const cards = args.droppableContainers.filter(
        (c) => typeOf(c.data.current) === "card" && (c.data.current as Typed)?.status === column.id,
    );
    return cards.length > 0 ? closestCenter({ ...args, droppableContainers: cards }) : [column];
};

// ── Keyboard: ←/→ jump to the next column, ↑/↓ move within the column ─────

const COLUMN_STEP: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
const ROW_STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
    const colStep = COLUMN_STEP[event.code];
    const rowStep = ROW_STEP[event.code];
    if (!colStep && !rowStep) return undefined;
    event.preventDefault();

    const { active, droppableRects, droppableContainers, collisionRect } = context;
    const status = active?.data.current?.status as BookmarkStatus | undefined;
    if (!active || !status || !collisionRect) return currentCoordinates;

    if (colStep) {
        const from = BOOKMARK_STATUSES.indexOf(status);
        const to = Math.min(Math.max(from + colStep, 0), BOOKMARK_STATUSES.length - 1);
        const rect = droppableRects.get(BOOKMARK_STATUSES[to]);
        if (!rect) return currentCoordinates;
        // Centre the card in the target column, just under its header.
        return { x: rect.left + (rect.width - collisionRect.width) / 2, y: rect.top + 48 };
    }

    // The next card above/below in the same column.
    const cards = Array.from(droppableContainers.values())
        .filter((c) => c && c.id !== active.id && typeOf(c.data.current) === "card")
        .filter((c) => (c!.data.current as Typed)?.status === status)
        .map((c) => droppableRects.get(c!.id))
        .filter((r): r is NonNullable<typeof r> => !!r)
        .sort((a, b) => a.top - b.top);
    const target =
        rowStep > 0
            ? cards.find((r) => r.top > collisionRect.top + 1)
            : [...cards].reverse().find((r) => r.top < collisionRect.top - 1);
    return target ? { x: currentCoordinates.x, y: target.top } : currentCoordinates;
};

const titleOf = (active: { data: { current?: Record<string, unknown> } }) =>
    String(active.data.current?.title ?? "Anime");
const listOf = (over: { id: UniqueIdentifier; data: { current?: Record<string, unknown> } }) => {
    const status = (typeOf(over.data.current) === "card" ? over.data.current?.status : over.id) as BookmarkStatus;
    return BOOKMARK_STATUS_LABELS[status] ?? String(status);
};

// Screen reader messages (dnd-kit reads them in a live region).
const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active)}.`,
    onDragOver: ({ active, over }) =>
        over ? `${titleOf(active)} is in ${listOf(over)}.` : `${titleOf(active)} is not over a list.`,
    onDragEnd: ({ active, over }) =>
        over ? `${titleOf(active)} dropped in ${listOf(over)}.` : `${titleOf(active)} dropped.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active)} was cancelled.`,
};

const screenReaderInstructions = {
    draggable:
        "To move this anime, press space or enter. Use the up and down arrow keys to change its place " +
        "in the list, left and right to choose another list, then press space or enter to drop it, " +
        "or escape to cancel.",
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
        () => BOOKMARK_STATUSES.map((status) => ({ status, bookmarks: sortColumn(items, status) })),
        [items],
    );

    // Replace a card only if it still has the status we expect: a newer move
    // of the same card wins over an older save finishing late.
    const replaceIf = (animeId: string, ifStatus: BookmarkStatus, next: Bookmark) =>
        setItems((cur) => cur.map((b) => (b.animeId === animeId && b.status === ifStatus ? next : b)));

    const showError = (e: unknown) => setError(e instanceof BookmarkActionError ? e.code : "server");


    // ── Remove: the card is "tossed" into the bowl (utils/toss.ts), then an
    // Undo toast appears (one per removal, stacked). The delete is saved right
    // away; Undo re-adds the bookmark (same upsert as a move). Everything in
    // the bowl this visit can come back at once (tap the bowl twice).
    // Reduced motion: no toss, same toasts.
    const binRef = useRef<TossBinHandle>(null);
    const [leavingIds, setLeavingIds] = useState<ReadonlySet<string>>(new Set());
    const [returningIds, setReturningIds] = useState<ReadonlySet<string>>(new Set());
    const [toasts, setToasts] = useState<BoardToast[]>([]);
    const [removed, setRemoved] = useState<Removed[]>([]); // in the bowl, this visit
    const toastKey = useRef(0);

    const setLeaving = (animeId: string, on: boolean) => setLeavingIds((cur) => toggled(cur, animeId, on));
    const setReturning = (animeId: string, on: boolean) => setReturningIds((cur) => toggled(cur, animeId, on));
    const withoutCard = (animeId: string) => setItems((cur) => cur.filter((b) => b.animeId !== animeId));
    const outOfBowl = (ids: string[]) => setRemoved((cur) => cur.filter((r) => !ids.includes(r.bookmark.animeId)));

    function pushToast(toast: NewToast) {
        toastKey.current += 1;
        const key = toastKey.current;
        setToasts((cur) => [...cur, { ...toast, key }]);
    }

    // Fade out (keeping its slot), then drop the matching toasts.
    function dismissToasts(match: (t: BoardToast) => boolean) {
        let keys: number[] = [];
        setToasts((cur) => {
            const live = cur.filter((t) => !t.leaving);
            keys = cur.filter((t) => !t.leaving && match(t)).map((t) => t.key);
            return cur.map((t) =>
                keys.includes(t.key)
                    ? { ...t, leaving: true, frozenIndex: live.length - 1 - live.indexOf(t) }
                    : t,
            );
        });
        window.setTimeout(() => setToasts((cur) => cur.filter((t) => !keys.includes(t.key))), TOAST_EXIT_MS);
    }

    function showRemovedToast(bookmark: Bookmark, topping: Topping, focus: boolean) {
        setRemoved((cur) => [...cur.filter((r) => r.bookmark.animeId !== bookmark.animeId), { bookmark, topping }]);
        pushToast({ kind: "removed", bookmark, topping, focus });
    }

    async function handleRemove(animeId: string) {
        const before = items.find((b) => b.animeId === animeId);
        if (!before) return;

        setError(null);
        const cardEl = findCard(animeId);
        // Only keyboard users get focus moved to Undo. A mouse click / tap also
        // focuses the trash button, but moving focus then would open the toast
        // stack and pause every timer until the next click.
        const focused = document.activeElement;
        const hadFocus = !!cardEl && !!focused && cardEl.contains(focused) && focused.matches(":focus-visible");
        const bin = binRef.current;
        const save = remove.mutateAsync({ animeId }); // starts now, in parallel with the toss
        const topping = randomTopping(); // Undo brings back the same one
        let failed = false;
        let landed: Promise<void> | null = null;
        let timer: number | undefined;

        if (cardEl && bin && !prefersReducedMotion()) {
            landed = tossToBin(cardEl, bin, topping).landed; // clones the card before it hides
            setLeaving(animeId, true);
            timer = window.setTimeout(() => {
                withoutCard(animeId);
                setLeaving(animeId, false);
            }, EXIT_MS);
            void landed.then(() => {
                if (failed) return;
                bin.add(1);
                window.setTimeout(() => !failed && showRemovedToast(before, topping, hadFocus), TOAST_DELAY_MS);
            });
        } else {
            withoutCard(animeId);
            bin?.add(1);
            showRemovedToast(before, topping, hadFocus);
        }

        try {
            await save;
        } catch (e) {
            failed = true;
            window.clearTimeout(timer);
            setLeaving(animeId, false);
            setItems((cur) => (cur.some((b) => b.animeId === animeId) ? cur : [...cur, before]));
            outOfBowl([animeId]);
            dismissToasts((t) => t.kind === "removed" && t.bookmark.animeId === animeId);
            if (landed) void landed.then(() => bin?.add(-1)); // ball may still be flying
            else bin?.add(-1);
            showError(e);
        }
    }

    /**
     * Put removed anime back: cards return to the top of their columns
     * (hidden while their topping flies home, 120ms apart), saved in
     * parallel. Returns how many came back.
     */
    async function bringBack(entries: Removed[]): Promise<number> {
        const back = entries.filter((r) => !items.some((b) => b.animeId === r.bookmark.animeId));
        if (back.length === 0) return 0;
        const ids = back.map((r) => r.bookmark.animeId);
        outOfBowl(ids);
        setError(null);

        const bin = binRef.current;
        const animate = !!bin && !prefersReducedMotion();
        // Synchronously, so each card can be measured as its flight's target.
        flushSync(() => {
            // Each goes on top of its column (the server does the same: MIN - GAP).
            setItems((cur) => {
                const tops = new Map<BookmarkStatus, number>();
                const restored = back.map((r, i) => {
                    const { status } = r.bookmark;
                    const column = cur.filter((b) => b.status === status).map((b) => b.position);
                    const top = (tops.get(status) ?? (column.length ? Math.min(...column) : 0)) - POSITION_GAP;
                    tops.set(status, top);
                    return { ...r.bookmark, position: top, updatedAt: stampAfter(i) };
                });
                return [...cur, ...restored];
            });
            if (animate) setReturningIds((cur) => ids.reduce((set, id) => toggled(set, id, true), cur));
        });

        back.forEach((entry, i) => {
            const { animeId } = entry.bookmark;
            const start = () => {
                const cardEl = findCard(animeId);
                if (animate && bin && cardEl) {
                    window.setTimeout(() => bin.add(-1), POP_OUT_MS);
                    void popFromBin(cardEl, bin, entry.topping).finally(() => setReturning(animeId, false));
                } else {
                    bin?.add(-1);
                    setReturning(animeId, false);
                }
            };
            if (i === 0) start();
            else window.setTimeout(start, i * RESTORE_STAGGER_MS);
        });

        const results = await Promise.allSettled(
            back.map(({ bookmark }) =>
                setStatus.mutateAsync({
                    animeId: bookmark.animeId,
                    status: bookmark.status,
                    title: bookmark.title,
                    posterUrl: bookmark.posterUrl,
                }),
            ),
        );

        let restored = 0;
        let firstError: unknown = null;
        results.forEach((result, i) => {
            const entry = back[i];
            const { animeId, status } = entry.bookmark;
            if (result.status === "fulfilled") {
                restored += 1;
                replaceIf(animeId, status, result.value);
            } else {
                // Still deleted on the server: back into the bowl.
                withoutCard(animeId);
                setReturning(animeId, false);
                setRemoved((cur) => [...cur, entry]);
                bin?.add(1);
                firstError ??= result.reason;
            }
        });
        if (firstError) showError(firstError);
        return restored;
    }

    function handleUndo(key: number) {
        const toast = toasts.find((t) => t.key === key);
        if (!toast || toast.kind !== "removed") return;
        dismissToasts((t) => t.key === key);
        void bringBack([{ bookmark: toast.bookmark, topping: toast.topping }]);
    }

    // Bowl tapped twice: everything removed this visit comes back. No toast:
    // the cards flying home are the feedback.
    function handleRestoreAll() {
        if (removed.length === 0) return;
        dismissToasts((t) => t.kind === "removed");
        void bringBack(removed);
    }

    // ── Drag and drop: reorder within a column, or move to an exact spot in
    // another one. While dragging across columns the card is moved in local
    // state so the gap opens live; it's saved once, on drop (one UPDATE, plus
    // a column renumber in the rare case there's no room left).
    const move = useMoveBookmark();
    const reorder = useReorderColumn();
    const [activeId, setActiveId] = useState<string | null>(null);
    const [originStatus, setOriginStatus] = useState<BookmarkStatus | null>(null);
    const activeBookmark = activeId ? items.find((b) => b.animeId === activeId) : undefined;
    // Board as it was at drag start (to cancel / roll back) and columns
    // renumbered locally while dragging (they must be saved too).
    const dragSnapshot = useRef<Bookmark[]>([]);
    const dragRenumbered = useRef<Set<BookmarkStatus>>(new Set());

    const sensors = useSensors(
        // Mouse: anywhere on the card, after a 4px move (clicks still work).
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        // Touch: long-press anywhere (swipes still scroll); the grip is instant.
        useSensor(CardTouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
    );

    function handleDragStart({ active }: DragStartEvent) {
        const id = String(active.id);
        dragSnapshot.current = items;
        dragRenumbered.current = new Set();
        setOriginStatus(items.find((b) => b.animeId === id)?.status ?? null);
        setActiveId(id);
    }

    // Over another column: move the card there now, at the hovered spot.
    // (Within its own column, sortable just animates the gap.)
    function handleDragOver({ active, over }: DragOverEvent) {
        if (!over) return;
        const id = String(active.id);
        const current = items.find((b) => b.animeId === id);
        if (!current) return;

        const overCard = typeOf(over.data.current) === "card";
        const target = (overCard ? (over.data.current as Typed)?.status : over.id) as BookmarkStatus;
        if (!BOOKMARK_STATUSES.includes(target) || target === current.status) return;

        const others = sortColumn(items, target).filter((b) => b.animeId !== id);
        let index = others.length; // empty space / empty column: at the end
        if (overCard) {
            const i = others.findIndex((b) => b.animeId === over.id);
            if (i >= 0) {
                const dragged = active.rect.current.translated;
                const below = !!dragged && dragged.top > over.rect.top + over.rect.height / 2;
                index = below ? i + 1 : i;
            }
        }

        const placed = positionAt(others, index);
        let position = placed.position;
        const renumber = placed.renumber;
        let next = items;
        if (renumber) {
            next = withPositions(next, renumbered(others));
            position = index * POSITION_GAP - POSITION_GAP / 2; // between its new neighbours
            dragRenumbered.current.add(target);
        }
        setItems(next.map((b) => (b.animeId === id ? { ...b, status: target, position } : b)));
    }

    function endDrag() {
        setActiveId(null);
        setOriginStatus(null);
    }

    function handleDragCancel() {
        endDrag();
        setItems(dragSnapshot.current);
    }

    function handleDragEnd({ active, over }: DragEndEvent) {
        const id = String(active.id);
        const snapshot = dragSnapshot.current;
        const origin = snapshot.find((b) => b.animeId === id);
        const current = items.find((b) => b.animeId === id);
        endDrag();
        if (!over || !origin || !current) {
            setItems(snapshot);
            return;
        }

        // Final order of the card's column (a reorder inside it is applied here).
        const status = current.status;
        const column = sortColumn(items, status);
        const from = column.findIndex((b) => b.animeId === id);
        const overIndex = column.findIndex((b) => b.animeId === over.id);
        const ordered = overIndex >= 0 && over.id !== id ? arrayMove(column, from, overIndex) : column;
        const index = ordered.findIndex((b) => b.animeId === id);

        const originIndex = sortColumn(snapshot, origin.status).findIndex((b) => b.animeId === id);
        if (status === origin.status && index === originIndex && dragRenumbered.current.size === 0) {
            setItems(snapshot); // dropped where it started
            return;
        }

        const placed = positionAt(
            ordered.filter((b) => b.animeId !== id),
            index,
        );
        let position = placed.position;
        const toRenumber = new Set(dragRenumbered.current);
        if (placed.renumber) toRenumber.add(status);

        // Renumbered columns get exactly the positions the server will save.
        let next = items;
        const reorders: { status: BookmarkStatus; animeIds: string[] }[] = [];
        for (const s of toRenumber) {
            const list = s === status ? ordered : sortColumn(items, s).filter((b) => b.animeId !== id);
            if (list.length === 0) continue;
            next = withPositions(next, renumbered(list));
            reorders.push({ status: s, animeIds: list.map((b) => b.animeId) });
            if (s === status) position = index * POSITION_GAP;
        }
        setItems(next.map((b) => (b.animeId === id ? { ...b, status, position, updatedAt: new Date() } : b)));
        void saveDrop(id, status, position, reorders, snapshot);
    }

    async function saveDrop(
        animeId: string,
        status: BookmarkStatus,
        position: number,
        reorders: { status: BookmarkStatus; animeIds: string[] }[],
        snapshot: Bookmark[],
    ) {
        setError(null);
        try {
            await move.mutateAsync({ animeId, status, position });
            for (const r of reorders) await reorder.mutateAsync(r);
        } catch (e) {
            // Put back the cards this drop touched, as they were before it.
            const touched = new Set([animeId, ...reorders.flatMap((r) => r.animeIds)]);
            const before = new Map(snapshot.map((b) => [b.animeId, b]));
            setItems((cur) => cur.map((b) => (touched.has(b.animeId) ? (before.get(b.animeId) ?? b) : b)));
            showError(e);
        }
    }

    return (
        <div className="kanban">
            {/* Live counts (follow moves/removes), handy on phones where columns stack. */}
            <div className="kanban-summary">
                <span className="kanban-summary-total">{items.length} anime</span>
                <ul className="kanban-summary-chips">
                    {columns.map(({ status, bookmarks }) => (
                        <li key={status} className="kanban-summary-chip" data-status={status}>
                            <span className="kanban-dot" aria-hidden="true" />
                            {BOOKMARK_STATUS_LABELS[status]}
                            <BumpCount value={bookmarks.length} className="kanban-summary-num" />
                        </li>
                    ))}
                </ul>
            </div>

            {error && <BookmarkErrorMessage error={error} loginHref={LOGIN_HREF} className="kanban-board-error" />}

            <DndContext
                id="bookmarks-board" // stable ids for SSR (no hydration mismatch)
                sensors={sensors}
                collisionDetection={collisionDetection}
                accessibility={{ announcements, screenReaderInstructions }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className="kanban-board">
                    {columns.map((column) => (
                        <KanbanColumn
                            key={column.status}
                            column={column}
                            leavingIds={leavingIds}
                            returningIds={returningIds}
                            isDropTarget={
                                !!activeBookmark &&
                                activeBookmark.status === column.status &&
                                originStatus !== column.status
                            }
                            onRemove={handleRemove}
                        />
                    ))}
                </div>

                {/* The copy that follows the pointer/finger. */}
                <DragOverlay>
                    {activeBookmark ? <BookmarkCardPreview bookmark={activeBookmark} /> : null}
                </DragOverlay>
            </DndContext>

            <TossBin ref={binRef} restoreCount={removed.length} onRestoreAll={() => void handleRestoreAll()} />
            <ToastStack
                toasts={toasts.map((t) => ({
                    key: t.key,
                    focus: t.focus,
                    leaving: t.leaving,
                    frozenIndex: t.frozenIndex,
                    message:
                        t.kind === "removed" ? (
                            <>
                                Removed <strong className="stack-toast-title">{t.bookmark.title}</strong>
                            </>
                        ) : (
                            t.text
                        ),
                    onUndo: t.kind === "removed" ? () => handleUndo(t.key) : undefined,
                }))}
                onExpire={(key) => dismissToasts((t) => t.key === key)}
            />
        </div>
    );
}

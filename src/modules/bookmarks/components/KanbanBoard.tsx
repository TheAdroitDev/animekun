"use client";

import { useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors,
    type Announcements,
    type CollisionDetection,
    type DragEndEvent,
    type KeyboardCoordinateGetter,
    type PointerSensorProps,
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
import {
    POP_OUT_MS,
    RESTORE_MS,
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
        const hadFocus = !!cardEl?.contains(document.activeElement);
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
            setItems((cur) => [...cur, ...back.map((r, i) => ({ ...r.bookmark, updatedAt: stampAfter(i) }))]);
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

    // Bowl tapped twice: everything removed this visit comes back, with ONE toast.
    async function handleRestoreAll() {
        if (removed.length === 0) return;
        const entries = removed;
        dismissToasts((t) => t.kind === "removed");
        const flights = prefersReducedMotion() ? 0 : (entries.length - 1) * RESTORE_STAGGER_MS + RESTORE_MS;
        const [restored] = await Promise.all([
            bringBack(entries),
            new Promise((resolve) => window.setTimeout(resolve, flights)),
        ]);
        if (restored > 0) pushToast({ kind: "info", text: `Brought back ${restored} anime`, focus: false });
    }

    // ── Drag and drop: a drop is just another move (same optimistic path).
    const [activeId, setActiveId] = useState<string | null>(null);
    const activeBookmark = activeId ? items.find((b) => b.animeId === activeId) : undefined;

    const sensors = useSensors(
        // Mouse: anywhere on the card, after a 4px move (clicks still work).
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        // Touch: long-press anywhere (swipes still scroll); the grip is instant.
        useSensor(CardTouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: columnKeyboardCoordinates }),
    );

    function handleDragEnd({ active, over }: DragEndEvent) {
        setActiveId(null);
        if (over) void handleMove(String(active.id), over.id as BookmarkStatus);
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
                onDragStart={({ active }) => setActiveId(String(active.id))}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
            >
                <div className="kanban-board">
                    {columns.map((column) => (
                        <KanbanColumn
                            key={column.status}
                            column={column}
                            leavingIds={leavingIds}
                            returningIds={returningIds}
                            dragging={activeBookmark}
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

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Trash2 } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

import { BOOKMARK_STATUSES, BOOKMARK_STATUS_LABELS, type Bookmark, type BookmarkStatus } from "../types";
import { smallPoster } from "../utils/poster";

interface BookmarkCardProps {
    bookmark: Bookmark;
    onMove: (status: BookmarkStatus) => void;
    onRemove: () => void;
}

/**
 * One card on the board. Presentational: the board owns the mutations, so
 * a move can update the columns instantly.
 *
 * Dragging starts only from the grip handle: the rest of the card keeps its
 * links, select and button, and on phones a swipe on the card still scrolls.
 * The "Move to…" select stays as the no-drag way to move a card.
 */
export function BookmarkCard({ bookmark, onMove, onRemove }: BookmarkCardProps) {
    const { animeId, title, status } = bookmark;
    const [confirming, setConfirming] = useState(false);
    const removeRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const href = ROUTES.ANIME_DETAIL(animeId);

    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
        id: animeId,
        data: { status, title },
        disabled: confirming,
    });

    // Keep keyboard focus on the button that replaced the one just pressed.
    const wasConfirming = useRef(false);
    useEffect(() => {
        if (confirming) confirmRef.current?.focus();
        else if (wasConfirming.current) removeRef.current?.focus();
        wasConfirming.current = confirming;
    }, [confirming]);

    return (
        <article ref={setNodeRef} className={`bookmark-card${isDragging ? " is-dragging" : ""}`}>
            <button
                ref={setActivatorNodeRef}
                type="button"
                className="bookmark-card-handle"
                {...attributes}
                {...listeners}
                aria-label={`Drag ${title}`}
            >
                <GripVertical size={14} aria-hidden="true" />
            </button>

            {/* prefetch={false}: a board can hold hundreds of cards. */}
            <Link href={href} className="bookmark-card-poster" prefetch={false} tabIndex={-1} aria-hidden="true">
                <CardPoster bookmark={bookmark} />
            </Link>

            <div className="bookmark-card-body">
                <Link href={href} className="bookmark-card-title" prefetch={false}>
                    {title}
                </Link>

                {confirming ? (
                    <div
                        className="bookmark-card-confirm"
                        onKeyDown={(e) => e.key === "Escape" && setConfirming(false)}
                    >
                        <span>Remove?</span>
                        <button ref={confirmRef} type="button" className="bookmark-card-yes" onClick={onRemove}>
                            Yes
                        </button>
                        <button type="button" className="bookmark-card-cancel" onClick={() => setConfirming(false)}>
                            Cancel
                        </button>
                    </div>
                ) : (
                    <div className="bookmark-card-actions">
                        <select
                            className="bookmark-card-move"
                            aria-label={`Move ${title} to another list`}
                            value=""
                            onChange={(e) => onMove(e.target.value as BookmarkStatus)}
                        >
                            <option value="" disabled>
                                Move to…
                            </option>
                            {BOOKMARK_STATUSES.filter((s) => s !== status).map((s) => (
                                <option key={s} value={s}>
                                    {BOOKMARK_STATUS_LABELS[s]}
                                </option>
                            ))}
                        </select>
                        <button
                            ref={removeRef}
                            type="button"
                            className="bookmark-card-remove"
                            onClick={() => setConfirming(true)}
                            aria-label={`Remove ${title}`}
                        >
                            <Trash2 size={14} aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}

/**
 * The copy that follows the pointer while dragging (DragOverlay). No hooks,
 * links or controls: just how the card looks.
 */
export function BookmarkCardPreview({ bookmark }: { bookmark: Bookmark }) {
    return (
        <div className="bookmark-card is-overlay" aria-hidden="true">
            <span className="bookmark-card-handle">
                <GripVertical size={14} />
            </span>
            <span className="bookmark-card-poster">
                <CardPoster bookmark={bookmark} />
            </span>
            <div className="bookmark-card-body">
                <span className="bookmark-card-title">{bookmark.title}</span>
            </div>
        </div>
    );
}

function CardPoster({ bookmark }: { bookmark: Bookmark }) {
    const poster = bookmark.posterUrl ? smallPoster(bookmark.posterUrl) : null;
    if (!poster) return <span className="bookmark-card-no-img">No image</span>;
    return (
        // Plain <img>: straight from the MAL CDN, never through /_next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={poster.src}
            srcSet={poster.srcSet}
            alt=""
            width={48}
            height={68}
            loading="lazy"
            decoding="async"
            draggable={false}
        />
    );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, Trash2 } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

import type { Bookmark } from "../types";
import { cardPoster } from "../utils/poster";

interface BookmarkCardProps {
    bookmark: Bookmark;
    onRemove: () => void;
}

/**
 * One card on the board. Presentational: the board owns the mutations, so
 * a move can update the columns instantly.
 *
 * Moving is drag and drop only, from the grip handle: mouse, touch (the
 * handle drags instantly) and keyboard (Tab to the handle, Space, arrows,
 * Space). The rest of the card keeps its links and button, and on phones a
 * swipe on the card still scrolls.
 */
export function BookmarkCard({ bookmark, onRemove }: BookmarkCardProps) {
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
        <article ref={setNodeRef} className={`bookmark-card${isDragging ? " is-dragging" : ""}`} data-status={status}>
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

            {/* inert while confirming: focus stays inside the overlay. */}
            <div className="bookmark-card-body" inert={confirming}>
                <Link href={href} className="bookmark-card-title" prefetch={false}>
                    {title}
                </Link>

                <div className="bookmark-card-actions">
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
            </div>

            {/* Covers the whole card, so "Remove? Yes / Cancel" always fits. */}
            {confirming && (
                <div
                    className="bookmark-card-confirm"
                    role="group"
                    aria-label={`Remove ${title}?`}
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
            )}
        </article>
    );
}

/**
 * The copy that follows the pointer while dragging (DragOverlay). No hooks,
 * links or controls: just how the card looks.
 */
export function BookmarkCardPreview({ bookmark }: { bookmark: Bookmark }) {
    return (
        <div className="bookmark-card is-overlay" data-status={bookmark.status} aria-hidden="true">
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

/**
 * Plain <picture>/<img>: straight from the MAL CDN, never through
 * /_next/image. Desktop (>640px, bigger card) gets MAL's medium size;
 * phones get the thumbnail (medium on 2× screens). Each device downloads
 * only one of them.
 */
function CardPoster({ bookmark }: { bookmark: Bookmark }) {
    const poster = bookmark.posterUrl ? cardPoster(bookmark.posterUrl) : null;
    if (!poster) return <span className="bookmark-card-no-img">No image</span>;
    return (
        <picture>
            {poster.desktop && <source media="(min-width: 641px)" srcSet={poster.desktop} />}
            <img
                src={poster.src}
                srcSet={poster.srcSet}
                alt=""
                width={56}
                height={80}
                loading="lazy"
                decoding="async"
                draggable={false}
            />
        </picture>
    );
}

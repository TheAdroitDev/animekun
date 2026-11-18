"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
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
 * Moving is drag and drop only:
 * - mouse: grab anywhere on the card (a 4px move starts it, so clicks on
 *   the title and the trash button still work);
 * - touch: long-press anywhere (a swipe still scrolls), or the grip, which
 *   drags instantly;
 * - keyboard: Tab to the grip, Space, arrows, Space. dnd-kit only starts a
 *   keyboard drag from the activator (the grip), so Enter on the title
 *   link still opens the anime.
 */
export function BookmarkCard({ bookmark, onRemove }: BookmarkCardProps) {
    const { animeId, title, status } = bookmark;
    const href = ROUTES.ANIME_DETAIL(animeId);

    // Sortable: cards slide apart to open a gap where the dragged card will land.
    // type "card" lets the board's collision logic prefer cards over columns.
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging, transform, transition } =
        useSortable({
            id: animeId,
            data: { type: "card", status, title },
        });

    return (
        // data-bookmark-id: the board finds this element to toss it / fly it back.
        // Drag listeners on the whole card; the grip is the keyboard activator.
        <article
            ref={setNodeRef}
            className={`bookmark-card${isDragging ? " is-dragging" : ""}`}
            data-status={status}
            data-bookmark-id={animeId}
            style={{
                transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
                transition: transition ?? undefined,
            }}
            {...listeners}
        >
            <button
                ref={setActivatorNodeRef}
                type="button"
                className="bookmark-card-handle"
                {...attributes}
                aria-label={`Drag ${title}`}
            >
                <GripVertical size={14} aria-hidden="true" />
            </button>

            {/* prefetch={false}: a board can hold hundreds of cards. */}
            <Link
                href={href}
                className="bookmark-card-poster"
                prefetch={false}
                tabIndex={-1}
                aria-hidden="true"
                draggable={false} // no native link drag fighting the card drag
            >
                <CardPoster bookmark={bookmark} />
            </Link>

            <div className="bookmark-card-body">
                <Link href={href} className="bookmark-card-title" prefetch={false} draggable={false}>
                    {title}
                </Link>

                <div className="bookmark-card-actions">
                    {/* No confirm step: the card is tossed into the bin and an Undo toast appears. */}
                    <button
                        type="button"
                        className="bookmark-card-remove"
                        onClick={onRemove}
                        aria-label={`Remove ${title}`}
                    >
                        <Trash2 size={14} aria-hidden="true" />
                    </button>
                </div>
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

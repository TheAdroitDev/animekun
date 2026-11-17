"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

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
 */
export function BookmarkCard({ bookmark, onMove, onRemove }: BookmarkCardProps) {
    const { animeId, title, posterUrl, status } = bookmark;
    const [confirming, setConfirming] = useState(false);
    const removeRef = useRef<HTMLButtonElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const poster = posterUrl ? smallPoster(posterUrl) : null;
    const href = ROUTES.ANIME_DETAIL(animeId);

    // Keep keyboard focus on the button that replaced the one just pressed.
    const wasConfirming = useRef(false);
    useEffect(() => {
        if (confirming) confirmRef.current?.focus();
        else if (wasConfirming.current) removeRef.current?.focus();
        wasConfirming.current = confirming;
    }, [confirming]);

    return (
        <article className="bookmark-card">
            {/* prefetch={false}: a board can hold hundreds of cards. */}
            <Link href={href} className="bookmark-card-poster" prefetch={false} tabIndex={-1} aria-hidden="true">
                {poster ? (
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
                    />
                ) : (
                    <span className="bookmark-card-no-img">No image</span>
                )}
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

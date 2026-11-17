"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, ChevronDown, LogIn } from "lucide-react";

import { trackEvent } from "@/components/analytics/TracwellAnalytics";
import { useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants/route";
import {
    BOOKMARK_STATUSES,
    BOOKMARK_STATUS_LABELS,
    BookmarkActionError,
    BookmarkErrorMessage,
    useBookmarkStatuses,
    useRemoveBookmark,
    useSetBookmarkStatus,
    type ActionError,
    type BookmarkStatus,
} from "@/modules/bookmarks";

interface BookmarkButtonProps {
    animeId: string;
    title: string;
    // Raw MAL CDN URL (not the ImageKit one): the board loads it directly.
    posterUrl: string | null;
}

/**
 * Bookmark status menu on the anime detail page.
 * - Logged in: pick one of 5 statuses or remove. Updates instantly and
 *   rolls back with a message if the save fails.
 * - Logged out: a login link that comes back to this anime afterwards.
 *   No bookmark request is made at all.
 *
 * useSession() shares the Navbar UserMenu's session state (one fetch for
 * the whole page), and the status map is fetched once per page load.
 */
export function BookmarkButton({ animeId, title, posterUrl }: BookmarkButtonProps) {
    const { data: session } = useSession();
    const { data: statusMap, isLoading } = useBookmarkStatuses();
    const setStatus = useSetBookmarkStatus();
    const remove = useRemoveBookmark();

    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<ActionError | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close on click or touch outside, or on Escape (focus back on the button).
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setIsOpen(false);
            buttonRef.current?.focus();
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const loginHref = `${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(ROUTES.ANIME_DETAIL(animeId))}`;
    const current: BookmarkStatus | undefined = statusMap?.[animeId];

    // mutateAsync + catch: TanStack fires per-call mutate() callbacks only
    // for the last call, so a quick second click could swallow an error.
    const handleError = (e: unknown) => setError(e instanceof BookmarkActionError ? e.code : "server");

    function chooseStatus(status: BookmarkStatus) {
        setIsOpen(false);
        setError(null);
        if (status === current) return;
        setStatus.mutateAsync({ animeId, status, title, posterUrl }).catch(handleError);
    }

    function removeFromList() {
        setIsOpen(false);
        setError(null);
        remove.mutateAsync({ animeId }).catch(handleError);
    }

    function toggleMenu() {
        if (!isOpen) {
            trackEvent("bookmark_clicked", {
                anime_id: animeId,
                state: session ? "menu" : "login_prompt",
            });
        }
        setError(null);
        setIsOpen((prev) => !prev);
    }

    if (!session) {
        return (
            <div className="bookmark-dropdown-container" ref={containerRef}>
                <button
                    ref={buttonRef}
                    type="button"
                    className="bookmark-btn bookmark-btn-unauth"
                    onClick={toggleMenu}
                    aria-expanded={isOpen}
                >
                    <Bookmark size={16} className="bookmark-icon" />
                    <span>Add to Bookmarks</span>
                    <ChevronDown size={14} className={`bookmark-chevron ${isOpen ? "open" : ""}`} />
                </button>

                {isOpen && (
                    <div className="bookmark-menu bookmark-menu-unauth">
                        <div className="bookmark-unauth-header">
                            <p className="bookmark-unauth-title">Track this anime</p>
                            <p className="bookmark-unauth-desc">
                                Login to organize into Watching, Completed, or Plan to Watch lists.
                            </p>
                        </div>
                        <Link href={loginHref} className="bookmark-login-link">
                            <LogIn size={14} />
                            <span>Login to bookmark</span>
                        </Link>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bookmark-dropdown-container" ref={containerRef}>
            <button
                ref={buttonRef}
                type="button"
                className={`bookmark-btn${current ? " active" : ""}`}
                onClick={toggleMenu}
                aria-expanded={isOpen}
                disabled={isLoading}
            >
                <Bookmark size={16} className={`bookmark-icon${current ? " fill" : ""}`} />
                <span>{current ? BOOKMARK_STATUS_LABELS[current] : "Add to Bookmarks"}</span>
                <ChevronDown size={14} className={`bookmark-chevron ${isOpen ? "open" : ""}`} />
            </button>

            {isOpen && (
                <div className="bookmark-menu">
                    <p className="bookmark-menu-header">Add to list</p>
                    {BOOKMARK_STATUSES.map((status) => {
                        const selected = status === current;
                        return (
                            <button
                                key={status}
                                type="button"
                                className={`bookmark-menu-item${selected ? " selected" : ""}`}
                                onClick={() => chooseStatus(status)}
                                aria-pressed={selected}
                            >
                                <span>{BOOKMARK_STATUS_LABELS[status]}</span>
                                {selected && <Check size={14} className="bookmark-check" aria-hidden="true" />}
                            </button>
                        );
                    })}
                    {current && (
                        <div className="bookmark-menu-divider">
                            <button type="button" className="bookmark-menu-remove" onClick={removeFromList}>
                                Remove from list
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && <BookmarkErrorMessage error={error} loginHref={loginHref} />}
        </div>
    );
}

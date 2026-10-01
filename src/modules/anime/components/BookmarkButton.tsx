"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bookmark, ChevronDown, Check, LogIn } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

export const BOOKMARK_STATUSES = [
    { id: "watching", label: "Watching" },
    { id: "completed", label: "Completed" },
    { id: "plan_to_watch", label: "Plan to Watch" },
    { id: "on_hold", label: "On Hold" },
    { id: "dropped", label: "Dropped" },
] as const;

export type BookmarkStatus = (typeof BOOKMARK_STATUSES)[number]["id"];

interface BookmarkButtonProps {
    animeId: string;
    animeTitle?: string;
    /** Auth state flag — will be wired to useSession() in Phase 6 */
    isAuthenticated?: boolean;
    initialStatus?: BookmarkStatus | null;
    onStatusChange?: (status: BookmarkStatus | null) => void;
}

export function BookmarkButton({
    animeId: _animeId,
    animeTitle: _animeTitle,
    isAuthenticated = false,
    initialStatus = null,
    onStatusChange,
}: BookmarkButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | null>(initialStatus);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click or touch outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside, { passive: true });
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (status: BookmarkStatus) => {
        const nextStatus = selectedStatus === status ? null : status;
        setSelectedStatus(nextStatus);
        setIsOpen(false);
        onStatusChange?.(nextStatus);
    };

    const currentLabel = selectedStatus
        ? BOOKMARK_STATUSES.find((s) => s.id === selectedStatus)?.label
        : null;

    // Unauthenticated state: direct prompt to login
    if (!isAuthenticated) {
        return (
            <div className="bookmark-dropdown-container" ref={containerRef}>
                <div className="bookmark-unauth-group">
                    <button
                        type="button"
                        className="bookmark-btn bookmark-btn-unauth"
                        onClick={() => setIsOpen((prev) => !prev)}
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                    >
                        <Bookmark size={16} className="bookmark-icon" />
                        <span>Add to Bookmarks</span>
                        <ChevronDown size={14} className={`bookmark-chevron ${isOpen ? "open" : ""}`} />
                    </button>

                    {isOpen && (
                        <div className="bookmark-menu bookmark-menu-unauth" role="menu">
                            <div className="bookmark-unauth-header">
                                <p className="bookmark-unauth-title">Track this anime</p>
                                <p className="bookmark-unauth-desc">
                                    Login to organize into Watching, Completed, or Plan to Watch lists.
                                </p>
                            </div>
                            <Link href={ROUTES.AUTH.LOGIN} className="bookmark-login-link">
                                <LogIn size={14} />
                                <span>Login to bookmark</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Authenticated state: list management dropdown
    return (
        <div className="bookmark-dropdown-container" ref={containerRef}>
            <button
                type="button"
                className={`bookmark-btn ${selectedStatus ? "active" : ""}`}
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <Bookmark size={16} className={`bookmark-icon ${selectedStatus ? "fill" : ""}`} />
                <span>{currentLabel ? currentLabel : "Add to Bookmarks"}</span>
                <ChevronDown size={14} className={`bookmark-chevron ${isOpen ? "open" : ""}`} />
            </button>

            {isOpen && (
                <div className="bookmark-menu" role="menu">
                    <div className="bookmark-menu-header">Select Watch Status</div>
                    {BOOKMARK_STATUSES.map((status) => {
                        const isCurrent = selectedStatus === status.id;
                        return (
                            <button
                                key={status.id}
                                type="button"
                                className={`bookmark-menu-item ${isCurrent ? "selected" : ""}`}
                                onClick={() => handleSelect(status.id)}
                                role="menuitem"
                            >
                                <span className="bookmark-menu-item-label">{status.label}</span>
                                {isCurrent && <Check size={14} className="bookmark-check" />}
                            </button>
                        );
                    })}

                    {selectedStatus && (
                        <div className="bookmark-menu-divider">
                            <button
                                type="button"
                                className="bookmark-menu-remove"
                                onClick={() => {
                                    setSelectedStatus(null);
                                    setIsOpen(false);
                                    onStatusChange?.(null);
                                }}
                            >
                                Remove from Watchlist
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

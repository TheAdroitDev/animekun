"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, ChevronDown, Hammer, LogIn } from "lucide-react";

import { useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants/route";

interface BookmarkButtonProps {
    animeId: string;
}

/**
 * Bookmarks are still being built (Phase 7).
 * - Logged in: a "coming soon" note, so users know it's in the pipeline.
 * - Logged out: a login link that comes back to this anime afterwards.
 *
 * useSession() shares the Navbar UserMenu's session state (one fetch for
 * the whole page), so this adds no extra request.
 */
export function BookmarkButton({ animeId }: BookmarkButtonProps) {
    const { data: session } = useSession();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click or touch outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside, { passive: true });
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [isOpen]);

    const loginHref = `${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(ROUTES.ANIME_DETAIL(animeId))}`;
    const firstName = session?.user.name.split(" ")[0];

    return (
        <div className="bookmark-dropdown-container" ref={containerRef}>
            <button
                type="button"
                className="bookmark-btn bookmark-btn-unauth"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
            >
                <Bookmark size={16} className="bookmark-icon" />
                <span>Add to Bookmarks</span>
                {session && <span className="bookmark-soon-badge">Soon</span>}
                <ChevronDown size={14} className={`bookmark-chevron ${isOpen ? "open" : ""}`} />
            </button>

            {isOpen && (
                <div className="bookmark-menu bookmark-menu-unauth">
                    {session ? (
                        <div className="bookmark-unauth-header">
                            <p className="bookmark-unauth-title bookmark-soon-title">
                                <Hammer size={14} className="bookmark-soon-icon" />
                                Bookmarks are being built
                            </p>
                            <p className="bookmark-unauth-desc">
                                Watching, Completed and Plan to Watch lists are coming soon.
                                Stay tuned, {firstName}!
                            </p>
                        </div>
                    ) : (
                        <>
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
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Sun01Icon,
    Moon02Icon,
    Menu01Icon,
    Cancel01Icon,
    Search01Icon,
} from "@hugeicons/core-free-icons";
import { useSession } from "@/lib/auth-client";
import { ROUTES } from "@/lib/constants/route";
import { UserMenu } from "@/modules/auth/components/UserMenu";

/**
 * Both icons are rendered; CSS shows the right one per [data-theme]
 * (set before first paint by the head script), so the icon is correct
 * immediately instead of swapping after hydration.
 */
function ThemeIcons() {
    return (
        <>
            <HugeiconsIcon icon={Sun01Icon} size={18} strokeWidth={1.8} className="theme-icon-sun" />
            <HugeiconsIcon icon={Moon02Icon} size={18} strokeWidth={1.8} className="theme-icon-moon" />
        </>
    );
}

// Quiz is hidden until its page exists (Phase 9): links to 404s on every
// page hurt visitors and SEO. Add it back then.
const navLinks: { label: string; href: string; prefetch?: false }[] = [
    { label: "World", href: ROUTES.HOME },
    { label: "Search", href: ROUTES.SEARCH },
    // "/#town-hall" (not "#town-hall") so it also works from other pages
    { label: "Town Hall", href: "/#town-hall" },
];

// Signed-in only: for everyone else (and Google) it would just redirect to
// login. prefetch={false}: /bookmarks is dynamic, so prefetching it would
// run a server function on every page view.
const bookmarksLink = { label: "Bookmarks", href: ROUTES.DASHBOARD.BOOKMARKS, prefetch: false as const };

// ── Keyboard shortcuts: Ctrl/⌘ + K = search, D = switch theme ──

/** Typing in a field: single-key shortcuts (D) must not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// ⌘ on Apple devices, Ctrl elsewhere. Read in the browser only (the server
// render says "Ctrl"), via useSyncExternalStore so there's no hydration mismatch.
const noSubscribe = () => () => {};
const readIsMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);
const serverIsMac = () => false;

/** On /search already: focus its field (inside the key press / tap, so phones show the keyboard). */
function focusSearchField(): boolean {
    const field = document.querySelector<HTMLInputElement>(".search-input-field");
    if (!field) return false;
    field.focus();
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    return true;
}

export default function Navbar() {
    // Same shared session state as UserMenu: no extra request.
    const { data: session } = useSession();
    const links = session ? [...navLinks, bookmarksLink] : navLinks;
    const pathname = usePathname();
    const router = useRouter();
    const isMac = useSyncExternalStore(noSubscribe, readIsMac, serverIsMac);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // Sync theme state on mount
    useEffect(() => {
        queueMicrotask(() => {
            const current = document.documentElement.getAttribute("data-theme");
            setIsDark(current === "dark");
        });
    }, []);

    // Reads the live theme from <html> (not state), so quick repeated
    // presses of D always flip it, even before React re-renders.
    const toggleTheme = useCallback(() => {
        const root = document.documentElement;
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        root.style.colorScheme = next; // match the head script in layout.tsx
        localStorage.setItem("theme", next);
        setIsDark(next === "dark");
    }, []);

    // Ctrl/⌘ + K: go to search (or focus it when already there). D: switch
    // theme, except while typing in a field. One listener for the whole site.
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.isComposing) return;
            const key = e.key.toLowerCase();

            if (key === "k" && (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey) {
                e.preventDefault(); // the browser's own Ctrl+K (address-bar search)
                setMobileOpen(false);
                if (pathname === ROUTES.SEARCH && focusSearchField()) return;
                router.push(`${ROUTES.SEARCH}#search`);
                return;
            }

            if (key === "d" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.repeat && !isTypingTarget(e.target)) {
                toggleTheme();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [pathname, router, toggleTheme]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    return (
        <>
            <nav
                className={`navbar ${scrolled ? "navbar-scrolled" : ""}`}
                role="navigation"
                aria-label="Main navigation"
            >
                <div className="navbar-inner">
                    {/* ── Logo ── */}
                    <Link href={ROUTES.HOME} className="navbar-logo" aria-label="AnimeKun Home">
                        <Image
                            src="/animekun-logo-dark.png"
                            alt="AnimeKun logo"
                            width={44}
                            height={44}
                            className="navbar-logo-img navbar-logo-img-dark"
                            priority
                            unoptimized
                        />
                        <Image
                            src="/animekun-logo-light.png"
                            alt="AnimeKun logo"
                            width={44}
                            height={44}
                            className="navbar-logo-img navbar-logo-img-light"
                            priority
                            unoptimized
                        />
                    </Link>

                    {/* ── Desktop Links ── */}
                    <ul className="navbar-links">
                        {links.map((link) => (
                            <li key={link.href}>
                                <Link href={link.href} prefetch={link.prefetch} className="navbar-link">
                                    <span className="navbar-link-label">{link.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* ── Actions: theme (desktop), search (phones), account (both) ── */}
                    <div className="navbar-actions">
                        {/* One tap / click / Ctrl+K to search. #search focuses the
                            field on arrival; already on /search, focus it right here
                            (inside the tap, so iOS opens the keyboard too).
                            Desktop: "Search ⌘K" pill; phones: just the icon. */}
                        <Link
                            href={`${ROUTES.SEARCH}#search`}
                            className="navbar-search-btn"
                            aria-label="Search anime"
                            aria-keyshortcuts="Control+K Meta+K"
                            onClick={(e) => {
                                if (pathname === ROUTES.SEARCH && focusSearchField()) e.preventDefault();
                            }}
                        >
                            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
                            <span className="navbar-search-label" aria-hidden="true">
                                Search
                            </span>
                            <kbd className="navbar-kbd" aria-hidden="true">
                                {isMac ? "⌘" : "Ctrl"} K
                            </kbd>
                        </Link>

                        <button
                            className="theme-toggle navbar-theme-desktop"
                            onClick={toggleTheme}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            aria-keyshortcuts="D"
                            title={isDark ? "Light mode (D)" : "Dark mode (D)"}
                        >
                            <ThemeIcons />
                        </button>

                        <UserMenu />
                    </div>

                    {/* ── Mobile Hamburger ── */}
                    <button
                        className={`navbar-hamburger ${mobileOpen ? "navbar-hamburger-open" : ""}`}
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        aria-expanded={mobileOpen}
                    >
                        <HugeiconsIcon
                            icon={mobileOpen ? Cancel01Icon : Menu01Icon}
                            size={20}
                            strokeWidth={1.8}
                        />
                    </button>
                </div>
            </nav>

            {/* ── Mobile Overlay ── */}
            <div
                className={`navbar-overlay ${mobileOpen ? "navbar-overlay-visible" : ""}`}
                onClick={() => setMobileOpen(false)}
                aria-hidden="true"
            />

            {/* ── Mobile Drawer ── */}
            <aside
                className={`navbar-drawer ${mobileOpen ? "navbar-drawer-open" : ""}`}
                aria-label="Mobile navigation"
            >
                <div className="navbar-drawer-header">
                    <Link
                        href={ROUTES.HOME}
                        className="navbar-logo"
                        onClick={() => setMobileOpen(false)}
                        aria-label="AnimeKun Home"
                    >
                        <Image
                            src="/animekun-logo-dark.png"
                            alt="AnimeKun logo"
                            width={36}
                            height={36}
                            className="navbar-logo-img navbar-logo-img-dark"
                            loading="eager"
                            unoptimized
                        />
                        <Image
                            src="/animekun-logo-light.png"
                            alt="AnimeKun logo"
                            width={36}
                            height={36}
                            className="navbar-logo-img navbar-logo-img-light"
                            loading="eager"
                            unoptimized
                        />
                    </Link>

                    <button
                        className="navbar-drawer-close"
                        onClick={() => setMobileOpen(false)}
                        aria-label="Close menu"
                    >
                        <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.8} />
                    </button>
                </div>

                <ul className="navbar-drawer-links">
                    {links.map((link, i) => (
                        <li key={link.href} style={{ animationDelay: `${i * 50}ms` }}>
                            <Link
                                href={link.href}
                                prefetch={link.prefetch}
                                className="navbar-drawer-link"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="navbar-drawer-footer">
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                        style={{
                            width: "100%",
                            justifyContent: "center",
                            gap: "8px",
                            display: "flex",
                            alignItems: "center",
                        }}
                    >
                        <ThemeIcons />
                        <span style={{ fontSize: "13px", fontWeight: 500 }}>
                            {isDark ? "Light mode" : "Dark mode"}
                        </span>
                    </button>
                    {/* The account lives in the top bar on phones too. */}
                </div>
            </aside>
        </>
    );
}

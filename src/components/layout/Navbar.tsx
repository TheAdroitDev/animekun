"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Sun01Icon,
    Moon02Icon,
    Menu01Icon,
    Cancel01Icon,
} from "@hugeicons/core-free-icons";
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

// Quiz and Bookmarks are hidden until their pages exist (Phases 9 and 7):
// links to 404s on every page hurt visitors and SEO. Add them back then.
const navLinks = [
    { label: "World", href: ROUTES.HOME },
    { label: "Search", href: ROUTES.SEARCH },
    // "/#town-hall" (not "#town-hall") so it also works from other pages
    { label: "Town Hall", href: "/#town-hall" },
];

export default function Navbar() {
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

    const toggleTheme = useCallback(() => {
        const next = isDark ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        document.documentElement.style.colorScheme = next; // match the head script in layout.tsx
        localStorage.setItem("theme", next);
        setIsDark(!isDark);
    }, [isDark]);

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
                        {navLinks.map((link) => (
                            <li key={link.href}>
                                <Link href={link.href} className="navbar-link">
                                    <span className="navbar-link-label">{link.label}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* ── Desktop Actions ── */}
                    <div className="navbar-actions">
                        <button
                            className="theme-toggle"
                            onClick={toggleTheme}
                            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                            title={isDark ? "Light mode" : "Dark mode"}
                        >
                            <ThemeIcons />
                        </button>

                        <UserMenu variant="navbar" />
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
                            unoptimized
                        />
                        <Image
                            src="/animekun-logo-light.png"
                            alt="AnimeKun logo"
                            width={36}
                            height={36}
                            className="navbar-logo-img navbar-logo-img-light"
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
                    {navLinks.map((link, i) => (
                        <li key={link.href} style={{ animationDelay: `${i * 50}ms` }}>
                            <Link
                                href={link.href}
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

                    <UserMenu variant="drawer" onAction={() => setMobileOpen(false)} />
                </div>
            </aside>
        </>
    );
}

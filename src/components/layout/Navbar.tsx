"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navLinks = [
  { label: "World", href: "/" },
  { label: "Generate", href: "/generate" },
  { label: "Quiz", href: "/quiz" },
  { label: "Bookmarks", href: "/bookmarks" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className={`navbar ${scrolled ? "navbar--scrolled" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="navbar__inner">
          {/* ── Logo ── */}
          <Link href="/" className="navbar__logo" aria-label="AnimeKun Home">
            <div className="navbar__logo-icon">
              <span className="navbar__logo-letter">A</span>
            </div>
            <span className="navbar__logo-text">
              Anime<span className="navbar__logo-text--accent">Kun</span>
            </span>
          </Link>

          {/* ── Desktop Links ── */}
          <ul className="navbar__links">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="navbar__link">
                  <span className="navbar__link-label">{link.label}</span>
                  <span className="navbar__link-bar" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Desktop Login ── */}
          <div className="navbar__actions">
            <Link href="/auth" className="navbar__login-btn">
              Login
            </Link>
          </div>

          {/* ── Mobile Hamburger ── */}
          <button
            className={`navbar__hamburger ${mobileOpen ? "navbar__hamburger--open" : ""}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
            <span className="navbar__hamburger-line" />
          </button>
        </div>
      </nav>

      {/* ── Mobile Overlay ── */}
      <div
        className={`navbar-overlay ${mobileOpen ? "navbar-overlay--visible" : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── Mobile Drawer ── */}
      <aside
        className={`navbar-drawer ${mobileOpen ? "navbar-drawer--open" : ""}`}
        aria-label="Mobile navigation"
      >
        <div className="navbar-drawer__header">
          <Link
            href="/"
            className="navbar__logo"
            onClick={() => setMobileOpen(false)}
            aria-label="AnimeKun Home"
          >
            <div className="navbar__logo-icon">
              <span className="navbar__logo-letter">A</span>
            </div>
            <span className="navbar__logo-text">
              Anime<span className="navbar__logo-text--accent">Kun</span>
            </span>
          </Link>

          <button
            className="navbar-drawer__close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <ul className="navbar-drawer__links">
          {navLinks.map((link, i) => (
            <li key={link.href} style={{ animationDelay: `${i * 60}ms` }}>
              <Link
                href={link.href}
                className="navbar-drawer__link"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="navbar-drawer__footer">
          <Link
            href="/auth"
            className="navbar__login-btn navbar__login-btn--full"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
        </div>
      </aside>
    </>
  );
}

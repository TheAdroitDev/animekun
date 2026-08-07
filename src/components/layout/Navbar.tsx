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

const navLinks = [
  { label: "World", href: "/" },
  { label: "Generate", href: "/generate" },
  { label: "Quiz", href: "/quiz" },
  { label: "Bookmarks", href: "/bookmarks" },
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
    const current = document.documentElement.getAttribute("data-theme");
    setIsDark(current === "dark");
  }, []);

  const toggleTheme = useCallback(() => {
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
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
          <Link href="/" className="navbar-logo" aria-label="AnimeKun Home">
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
              <HugeiconsIcon
                icon={isDark ? Sun01Icon : Moon02Icon}
                size={18}
                strokeWidth={1.8}
              />
            </button>

            <Link href="/auth" className="navbar-login-btn">
              Login
            </Link>
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
            href="/"
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
            <HugeiconsIcon
              icon={isDark ? Sun01Icon : Moon02Icon}
              size={18}
              strokeWidth={1.8}
            />
            <span style={{ fontSize: "13px", fontWeight: 500 }}>
              {isDark ? "Light mode" : "Dark mode"}
            </span>
          </button>

          <Link
            href="/auth"
            className="navbar-login-btn navbar-login-btn-full"
            onClick={() => setMobileOpen(false)}
          >
            Login
          </Link>
        </div>
      </aside>
    </>
  );
}

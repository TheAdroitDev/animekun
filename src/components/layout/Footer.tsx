import Link from "next/link";
import Image from "next/image";
import {Cat,  Heart } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

const navigationLinks = [
    {
        title: "Explore",
        links: [
            { label: "Trending", href: ROUTES.HOME },
            { label: "Popular", href: `${ROUTES.SEARCH}?sort=popular` },
            { label: "Seasonal", href: ROUTES.HOME },
            { label: "Search & Filter", href: ROUTES.SEARCH },
        ],
    },
    {
        title: "Features",
        links: [
            { label: "AI Generator", href: ROUTES.DASHBOARD.GENERATE },
            { label: "Anime Quiz", href: ROUTES.DASHBOARD.QUIZ },
            { label: "Watchlist (Kanban)", href: ROUTES.DASHBOARD.BOOKMARKS },
        ],
    },
    {
        title: "Platform",
        links: [
            { label: "About", href: ROUTES.ABOUT },
            { label: "Pricing", href: ROUTES.PRICING },
            { label: "Login / Register", href: ROUTES.AUTH.LOGIN },
        ],
    },
];

const socialLinks = [
    {
        label: "Instagram",
        href: "https://www.instagram.com/theadroitdev/",
        icon: Cat,
    },
];

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer-section" role="contentinfo">
            <div className="footer-container">
                {/* Top: Brand & Columns */}
                <div className="footer-top">
                    {/* Brand Info */}
                    <div className="footer-brand">
                        <Link href={ROUTES.HOME} className="footer-logo" aria-label="AnimeKun Home">
                            <Image
                                src="/animekun-logo-dark.png"
                                alt="AnimeKun logo"
                                width={36}
                                height={36}
                                className="footer-logo-img footer-logo-img-dark"
                                unoptimized
                            />
                            <Image
                                src="/animekun-logo-light.png"
                                alt="AnimeKun logo"
                                width={36}
                                height={36}
                                className="footer-logo-img footer-logo-img-light"
                                unoptimized
                            />
                            <span className="footer-brand-name">AnimeKun</span>
                        </Link>
                        <p className="footer-tagline">
                            Discover, Organize &amp; Experience Anime. Powered by modern AI discovery,
                            interactive watchlist boards, and community trivia.
                        </p>
                        <div className="footer-socials">
                            {socialLinks.map((social) => {
                                const Icon = social.icon;
                                return (
                                    <a
                                        key={social.label}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="footer-social-btn"
                                        aria-label={social.label}
                                    >
                                        <Icon size={18} />
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Links Grid */}
                    <div className="footer-links-grid">
                        {navigationLinks.map((group) => (
                            <div key={group.title} className="footer-column">
                                <h3 className="footer-column-title">{group.title}</h3>
                                <ul className="footer-column-links">
                                    {group.links.map((link) => (
                                        <li key={link.label}>
                                            <Link href={link.href} className="footer-link">
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom: Copyright */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        &copy; {currentYear} AnimeKun. All rights reserved.
                    </p>
                    <p className="footer-credit">
                        Crafted with <Heart size={14} className="footer-heart-icon" /> for anime fans worldwide.
                    </p>
                </div>
            </div>
        </footer>
    );
}

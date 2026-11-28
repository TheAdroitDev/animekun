"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiMagicIcon,
    Quiz01Icon,
    SparklesIcon,
} from "@hugeicons/core-free-icons";
import { ROUTES } from "@/lib/constants/route";
import HeroMarquee from "./HeroMarquee";

export default function Hero() {
    return (
        <section className="hero-section" aria-label="Hero Introduction">
            <HeroMarquee />

            <div className="hero-container">
                <div className="hero-badge-wrapper">
                    <div className="hero-badge">
                        <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.8} />
                        <span>You can now LOGIN guys and BOOKMARKS(anime) are here enjoy. 🫶🏻 
                           <span className="hero-badge-line"> You can also ask AI to recommend anime 🤩</span>
                        </span>
                    </div>
                </div>

                <h1 className="hero-title">
                    <span className="hero-accent-text">Discover</span> & Organize  <span className="hero-accent-text">Anime</span> you{" "}
                    <span className="hero-accent-text">actually</span> want to watch.
                </h1>

                <p className="hero-subtitle">
                    No more endless MyAnimeList rabbit holes or guessing what to watch next.
                    Filter by your exact vibe, test your otaku skills against the community,
                    and track your watchlist.
                </p>

                <div className="hero-actions">
                    <Link href="/search" className="btn-primary">
                        <HugeiconsIcon icon={AiMagicIcon} size={16} strokeWidth={2} />
                        <span>Search Anime</span>
                    </Link>
                    <Link href={ROUTES.DASHBOARD.QUIZ} className="btn-secondary" prefetch={false}>
                        <HugeiconsIcon icon={Quiz01Icon} size={16} strokeWidth={1.8} />
                        <span>Test Your Otaku</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

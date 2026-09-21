"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiMagicIcon,
    Quiz01Icon,
    SparklesIcon,
} from "@hugeicons/core-free-icons";
import HeroMarquee from "./HeroMarquee";

export default function Hero() {
    return (
        <section className="hero-section" aria-label="Hero Introduction">
            <HeroMarquee />

            <div className="hero-container">
                <div className="hero-badge-wrapper">
                    <div className="hero-badge">
                        <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.8} />
                        <span>Use it guys and give me feedback; more work in progress 😎</span>
                    </div>
                </div>

                <h1 className="hero-title">
                    <span className="hero-accent-text">Discover</span> & Organize  <span className="hero-accent-text">Anime</span> you{" "}
                    <span className="hero-accent-text">actually</span> want to watch.
                </h1>

                <p className="hero-subtitle">
                    No more endless MyAnimeList rabbit holes or guessing what to watch next.
                    Filter by your exact vibe, test your trivia skills against the community,
                    and track your watchlist with zero clutter.
                </p>

                <div className="hero-actions">
                    <Link href="#generate" className="btn-primary">
                        <HugeiconsIcon icon={AiMagicIcon} size={16} strokeWidth={2} />
                        <span>Generate Anime</span>
                    </Link>
                    <Link href="#quiz" className="btn-secondary">
                        <HugeiconsIcon icon={Quiz01Icon} size={16} strokeWidth={1.8} />
                        <span>Test Your Otaku</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}

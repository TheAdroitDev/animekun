"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    BubbleChatIcon,
    ArrowRight01Icon,
    UserGroupIcon,
    Time02Icon,
} from "@hugeicons/core-free-icons";
import { ROUTES } from "@/lib/constants/route";

interface DiscussionTopic {
    id: string;
    tag: string;
    tagType: "hot" | "episode" | "debate";
    title: string;
    snippet: string;
    author: string;
    activeCount: number;
    timeAgo: string;
}

const TRENDING_TALKS: DiscussionTopic[] = [
    {
        id: "talk-1",
        tag: "🔥 Hot Take",
        tagType: "hot",
        title: "Saitama vs. Goku: Can the Serious Punch actually bypass Ultra Instinct?",
        snippet: "With Goku's divine autonomous dodging and Saitama's exponential strength growth from the cosmic Garou fight, who actually takes this in an all-out battle?",
        author: "KameHamePunch",
        activeCount: 342,
        timeAgo: "2 mins ago",
    },
    {
        id: "talk-2",
        tag: "📺 Episode Discussion",
        tagType: "episode",
        title: "Attack on Titan Finale: Did Eren's ultimate choice justify the Jaegerist conclusion?",
        snippet: "Years after the rumbling finale, the fandom is still fiercely divided. Was Eren a tragic slave to freedom or did his motivations falter in the final chapter?",
        author: "Jaegerist_4Ever",
        activeCount: 289,
        timeAgo: "12 mins ago",
    },
    {
        id: "talk-3",
        tag: "⚔️ Community Debate",
        tagType: "debate",
        title: "The Big 3 (One Piece, Naruto, Bleach) vs. The Dark Trio (JJK, CSM, Hell's Paradise)",
        snippet: "The iconic 2000s shounen titans vs. the new-gen ruthless dark masterpieces. Which era has delivered higher peaks, better fights, and lasting legacy?",
        author: "OtakuKing_Luffy",
        activeCount: 418,
        timeAgo: "25 mins ago",
    },
];

export default function TownHallSection() {
    return (
        <section id="town-hall" className="townhall-section" aria-label="Community Town Hall">
            <div className="townhall-container">
                {/* ── Section Header ── */}
                <div className="townhall-header">
                    <div className="townhall-badge">
                        <span className="live-indicator-dot" />
                        <span>TownHall • Live Community</span>
                    </div>
                    <h2 className="townhall-title">
                        The 24/7 Anime Gathering Ground.
                    </h2>
                    <p className="townhall-subtitle">
                        Ongoing talks, hot takes, and real-time episode reactions. Drop into ongoing discussions
                        with passionate anime fans from around the world.
                    </p>
                </div>

                {/* ── Trending Talks Grid ── */}
                <div className="townhall-grid">
                    {TRENDING_TALKS.map((talk) => (
                        <div key={talk.id} className="townhall-card">
                            <div className="townhall-card-top">
                                <span className={`townhall-tag townhall-tag-${talk.tagType}`}>
                                    {talk.tag}
                                </span>
                                <div className="townhall-time">
                                    <HugeiconsIcon icon={Time02Icon} size={13} strokeWidth={1.8} />
                                    <span>{talk.timeAgo}</span>
                                </div>
                            </div>

                            <h3 className="townhall-card-title">{talk.title}</h3>
                            <p className="townhall-card-snippet">{talk.snippet}</p>

                            <div className="townhall-card-footer">
                                <div className="townhall-user-info">
                                    <div className="townhall-avatar">
                                        {talk.author.slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="townhall-author-name">{talk.author}</span>
                                </div>
                                <div className="townhall-meta-pill">
                                    <HugeiconsIcon icon={UserGroupIcon} size={14} strokeWidth={1.8} />
                                    <span>{talk.activeCount} debating</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Call to Action Banner ── */}
                <div className="townhall-cta-banner">
                    <div className="townhall-cta-text">
                        <h4 className="townhall-cta-heading">Want to start your own anime discussion?</h4>
                        <p className="townhall-cta-sub">
                            Join the community chat, create custom threads, and voice your opinions.
                        </p>
                    </div>
                    <Link href={ROUTES.DASHBOARD.CHAT} className="btn-primary townhall-enter-btn">
                        <HugeiconsIcon icon={BubbleChatIcon} size={16} strokeWidth={2} />
                        <span>Enter the Town Hall</span>
                        <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

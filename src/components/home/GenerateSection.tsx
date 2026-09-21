"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    AiMagicIcon,
    ArrowRight01Icon,
    SparklesIcon,
    Search01Icon,
    FilterIcon,
} from "@hugeicons/core-free-icons";


import { GENRES } from "@/lib/constants/genres";
import { ROUTES } from "@/lib/constants/route";

const VIBE_PILLS = [
    { label: "Overpowered MC", prompt: "Overpowered main character who hides their power" },
    { label: "Mind Games & Suspense", prompt: "Psychological mind games with high stakes and twists" },
    { label: "Dark Fantasy", prompt: "Dark gritty fantasy with brutal consequences" },
    { label: "Comfort & Chill", prompt: "Relaxing slice of life comfort anime to unwind" },
    { label: "Tearjerker Romance", prompt: "Heartbreaking emotional romance with deep connection" },
    { label: "High-Octane Action", prompt: "Fast-paced sakuga action with great fight choreography" },
];

export default function GenerateSection() {
    const router = useRouter();
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [activeVibe, setActiveVibe] = useState<string | null>(null);
    const [promptText, setPromptText] = useState("");

    const toggleGenre = (slug: string) => {
        setSelectedGenres((prev) =>
            prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
        );
    };

    const selectVibe = (vibe: typeof VIBE_PILLS[number]) => {
        if (activeVibe === vibe.label) {
            setActiveVibe(null);
            setPromptText("");
        } else {
            setActiveVibe(vibe.label);
            setPromptText(vibe.prompt);
        }
    };

    const handleGenerate = (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (promptText.trim()) params.set("q", promptText.trim());
        if (selectedGenres.length > 0) params.set("genres", selectedGenres.join(","));
        router.push(`${ROUTES.DASHBOARD.GENERATE}?${params.toString()}`);
    };

    return (
        <section id="generate" className="generate-section" aria-label="Anime Generator">
            <div className="generate-container">
                <div className="generate-header">
                    <h2 className="generate-title">
                        Generate by your exact vibe.
                    </h2>
                    <p className="generate-subtitle">
                        Pick your mood, toggle genres, or describe what you want in plain English.
                        AnimeKun finds the hidden gems that match your taste.
                    </p>
                </div>

                <div className="generate-card">

                    <div className="generate-group">
                        <div className="generate-group-label">
                            <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={1.8} />
                            <span>1. Choose a vibe or trope:</span>
                        </div>
                        <div className="generate-pills-row">
                            {VIBE_PILLS.map((vibe) => {
                                const isSelected = activeVibe === vibe.label;
                                return (
                                    <button
                                        key={vibe.label}
                                        type="button"
                                        onClick={() => selectVibe(vibe)}
                                        className={`vibe-pill ${isSelected ? "vibe-pill-active" : ""}`}
                                    >
                                        {vibe.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="generate-group">
                        <div className="generate-group-label">
                            <HugeiconsIcon icon={FilterIcon} size={15} strokeWidth={1.8} />
                            <span>2. Filter by genre:</span>
                        </div>
                        <div className="generate-genres-row">
                            {GENRES.map((genre) => {
                                const isSelected = selectedGenres.includes(genre.slug);
                                return (
                                    <button
                                        key={genre.id}
                                        type="button"
                                        onClick={() => toggleGenre(genre.slug)}
                                        className={`genre-filter-pill ${isSelected ? "genre-filter-pill-active" : ""}`}
                                    >
                                        {genre.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <form onSubmit={handleGenerate} className="generate-form">
                        <div className="generate-input-wrapper">
                            <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} className="generate-input-icon" />
                            <input
                                type="text"
                                value={promptText}
                                onChange={(e) => setPromptText(e.target.value)}
                                placeholder="Or describe what you feel like watching in plain English..."
                                className="generate-input"
                            />
                        </div>
                        <button type="submit" className="generate-submit-btn">
                            <HugeiconsIcon icon={AiMagicIcon} size={16} strokeWidth={1.8} />
                            <span>Generate Anime</span>
                        </button>
                    </form>
                </div>

                <div className="generate-preview-card">
                    <div className="generate-preview-badge">
                        <span className="live-dot" />
                        <span>Example Match</span>
                    </div>
                    <div className="generate-preview-content">
                        <div className="generate-preview-poster">
                            <Image
                                src="https://cdn.myanimelist.net/images/anime/1935/127974.jpg"
                                alt="Steins;Gate"
                                width={110}
                                height={160}
                                className="generate-preview-img"
                                unoptimized
                            />
                        </div>
                        <div className="generate-preview-details">
                            <div className="generate-preview-top">
                                <h3 className="generate-preview-title">Steins;Gate</h3>
                                <span className="generate-preview-score">★ 9.07</span>
                            </div>
                            <div className="generate-preview-tags">
                                <span className="preview-tag">Sci-Fi</span>
                                <span className="preview-tag">Psychological</span>
                                <span className="preview-tag">Suspense</span>
                                <span className="preview-match-badge">99% Vibe Match</span>
                            </div>
                            <p className="generate-preview-desc">
                                A self-proclaimed eccentric mad scientist accidentally invents a microwave that sends text messages to the past, triggering a deadly butterfly effect across alternate timelines.
                            </p>
                            <Link href={ROUTES.DASHBOARD.GENERATE} className="generate-preview-cta">
                                <span>Try Generator with Your Own Prompts</span>
                                <HugeiconsIcon icon={ArrowRight01Icon} size={15} strokeWidth={2} />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";
import { GENRES } from "@/lib/constants/genres";
import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";

interface SearchContentProps {
    initialQuery?: string;
    initialGenre?: string;
}

export function SearchContent({
    initialQuery = "",
    initialGenre = "",
}: SearchContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Active filters from URL
    const activeQuery = searchParams.get("q") ?? initialQuery;
    const activeGenre = searchParams.get("genre") ?? initialGenre;

    return (
        <div className="search-page-layout">
            {/* ── Search Header & Search Input Bar ── */}
            <div className="search-header-container">
                <div className="search-header-text">
                    <h1 className="search-title">Explore Anime</h1>
                    <p className="search-subtitle">
                        Search by title, filter across 20+ genres, or discover seasonal staples.
                    </p>
                </div>

                <SearchBar defaultValue={initialQuery} />

                {/* Mobile Filter Toggle */}
                <div className="search-mobile-filter-bar">
                    <button
                        type="button"
                        className="search-mobile-filter-btn"
                        onClick={() => setMobileFilterOpen((prev) => !prev)}
                        aria-expanded={mobileFilterOpen}
                    >
                        <SlidersHorizontal size={16} />
                        <span>Filters {activeGenre ? `(${activeGenre})` : ""}</span>
                    </button>
                </div>
            </div>

            {/* ── Main Two-Column Layout (Sidebar + Results) ── */}
            <div className="search-main-columns">
                {/* ── Filter Sidebar (Desktop) / Mobile Drawer ── */}
                <aside className={`search-sidebar ${mobileFilterOpen ? "mobile-open" : ""}`}>
                    <div className="search-sidebar-header">
                        <h2 className="search-sidebar-title">Filters</h2>
                        <button
                            type="button"
                            className="search-sidebar-close-btn"
                            onClick={() => setMobileFilterOpen(false)}
                            aria-label="Close filters"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="search-filter-section">
                        <h3 className="search-filter-heading">Genres</h3>
                        <div className="search-genre-list">
                            {GENRES.map((g) => {
                                const isActive = activeGenre === g.slug;
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        className={`search-genre-tag ${isActive ? "active" : ""}`}
                                        onClick={() => {
                                            const params = new URLSearchParams(searchParams.toString());
                                            if (isActive) {
                                                params.delete("genre");
                                            } else {
                                                params.set("genre", g.slug);
                                            }
                                            router.push(`${ROUTES.SEARCH}?${params.toString()}`);
                                            setMobileFilterOpen(false);
                                        }}
                                    >
                                        {g.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                {/* ── Results Area ── */}
                <main className="search-results-area">
                    {/* Status Bar */}
                    <div className="search-results-bar">
                        <span className="search-results-count">
                            {activeQuery
                                ? `Results for "${activeQuery}"`
                                : activeGenre
                                  ? `Filtered by genre: ${activeGenre}`
                                  : "Browsing popular titles"}
                        </span>
                    </div>

                    {/* Results Grid (Skeleton placeholder until Step 5.2/5.6 data hookup) */}
                    <AnimeGrid isLoading={false} anime={[]} />
                </main>
            </div>
        </div>
    );
}

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";

interface SearchContentProps {
    initialQuery?: string;
    initialGenre?: string;
}

export function SearchContent({
    initialQuery = "",
    initialGenre = "",
}: SearchContentProps) {
    const searchParams = useSearchParams();
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Active filters from URL
    const activeQuery = searchParams.get("q") ?? initialQuery;
    const activeGenre = searchParams.get("genre") ?? initialGenre;
    const activeYear = searchParams.get("year");
    const activeStatus = searchParams.get("status");

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

            {/* ── Mobile Backdrop ── */}
            {mobileFilterOpen && (
                <div
                    className="search-backdrop"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Main Two-Column Layout (Sidebar + Results) ── */}
            <div className="search-main-columns">
                {/* ── Filter Sidebar ── */}
                <FilterPanel
                    className={mobileFilterOpen ? "mobile-open" : ""}
                    onClose={() => setMobileFilterOpen(false)}
                />

                {/* ── Results Area ── */}
                <main className="search-results-area">
                    {/* Status Bar */}
                    <div className="search-results-bar">
                        <span className="search-results-count">
                            {activeQuery
                                ? `Results for "${activeQuery}"${
                                      [
                                          activeGenre && `Genre: ${activeGenre}`,
                                          activeYear && `Year: ${activeYear}`,
                                          activeStatus && `Status: ${activeStatus}`,
                                      ]
                                          .filter(Boolean)
                                          .join(" · ")
                                          ? ` (${[
                                                activeGenre && `Genre: ${activeGenre}`,
                                                activeYear && `Year: ${activeYear}`,
                                                activeStatus && `Status: ${activeStatus}`,
                                            ]
                                                .filter(Boolean)
                                                .join(" · ")})`
                                          : ""
                                  }`
                                : [
                                      activeGenre && `Genre: ${activeGenre}`,
                                      activeYear && `Year: ${activeYear}`,
                                      activeStatus && `Status: ${activeStatus}`,
                                  ].filter(Boolean).length > 0
                                  ? `Filtered by: ${[
                                        activeGenre && `Genre: ${activeGenre}`,
                                        activeYear && `Year: ${activeYear}`,
                                        activeStatus && `Status: ${activeStatus}`,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}`
                                  : "Browsing all titles"}
                        </span>
                    </div>

                    {/* Results Grid (Skeleton placeholder until Step 5.2/5.6 data hookup) */}
                    <AnimeGrid isLoading={false} anime={[]} />
                </main>
            </div>
        </div>
    );
}

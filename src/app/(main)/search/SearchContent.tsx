"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";
import { useSearch } from "@/modules/anime/queries/use-search";
import { GENRE_SLUG_TO_ID } from "@/lib/constants/genres";
import type { SearchParams } from "@/modules/anime/types";

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

    //  Read all filter values from URL (single source of truth) 
    const activeQuery = searchParams.get("q") ?? initialQuery;
    const activeGenre = searchParams.get("genre") ?? initialGenre;
    const activeYear = searchParams.get("year");
    const activeStatus = searchParams.get("status");
    const activePage = searchParams.get("page");
    const activeSort = searchParams.get("sort");

    //  Convert genre slugs → numeric IDs via GENRE_SLUG_TO_ID 
    const genreIds = useMemo(() => {
        if (!activeGenre) return undefined;
        const ids = activeGenre
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
            .map((slug) => GENRE_SLUG_TO_ID[slug])
            .filter((id): id is number => id !== undefined);
        return ids.length > 0 ? ids : undefined;
    }, [activeGenre]);

    // ── Build search params for useSearch ──
    const searchConfig = useMemo<SearchParams>(() => {
        const params: SearchParams = {};
        if (activeQuery) params.query = activeQuery;
        if (genreIds) params.genreIds = genreIds;
        if (activeYear) params.year = Number(activeYear);
        if (activeStatus && ["airing", "complete", "upcoming"].includes(activeStatus)) {
            params.status = activeStatus as SearchParams["status"];
        }
        if (activeSort && ["score", "popularity", "date", "start_date"].includes(activeSort)) {
            params.sort = activeSort as SearchParams["sort"];
        }
        if (activePage) {
            const p = Number(activePage);
            if (!isNaN(p) && p > 0) params.page = p;
        }
        return params;
    }, [activeQuery, genreIds, activeYear, activeStatus, activeSort, activePage]);

    // ── Fetch search results ──
    const { data, isLoading } = useSearch(searchConfig);

    // ── Active filter summary for status bar ──
    const filterTags = useMemo(() => {
        const SORT_LABELS: Record<string, string> = {
            score: "Highest Score",
            popularity: "Most Popular",
            date: "Latest Release",
        };
        const tags: string[] = [];
        if (activeGenre) tags.push(`Genre: ${activeGenre}`);
        if (activeYear) tags.push(`Year: ${activeYear}`);
        if (activeStatus) tags.push(`Status: ${activeStatus}`);
        if (activeSort && SORT_LABELS[activeSort]) tags.push(`Sort: ${SORT_LABELS[activeSort]}`);
        return tags;
    }, [activeGenre, activeYear, activeStatus, activeSort]);

    const statusText = activeQuery
        ? `Results for "${activeQuery}"${filterTags.length > 0 ? ` (${filterTags.join(" · ")})` : ""}`
        : filterTags.length > 0
            ? `Filtered by: ${filterTags.join(" · ")}`
            : "Browsing all titles";

    return (
        <div className="search-page-layout">
            {/*  Search Header & Search Input Bar  */}
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

            {/*  Mobile Backdrop  */}
            {mobileFilterOpen && (
                <div
                    className="search-backdrop"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/*  Main Two-Column Layout (Sidebar + Results)  */}
            <div className="search-main-columns">
                {/*  Filter Sidebar  */}
                <FilterPanel
                    className={mobileFilterOpen ? "mobile-open" : ""}
                    onClose={() => setMobileFilterOpen(false)}
                />

                {/*  Results Area  */}
                <main className="search-results-area">
                    {/* Status Bar */}
                    <div className="search-results-bar">
                        <span className="search-results-count">
                            {statusText}
                            {data && !isLoading && (
                                <> — {data.total} result{data.total !== 1 ? "s" : ""}</>
                            )}
                        </span>
                    </div>

                    {/* Results Grid */}
                    <AnimeGrid isLoading={isLoading} anime={data?.data ?? []} />
                </main>
            </div>
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";
import { useSearch } from "@/modules/anime/queries/use-search";
import { searchQuerySchema } from "@/modules/anime/validations/search-schema";
import { ROUTES } from "@/lib/constants/route";
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

    // ── Parse & Validate raw URL query parameters via Zod ──
    const parsedQuery = useMemo(() => {
        const raw = {
            q: searchParams.get("q") ?? (initialQuery || undefined),
            genre: searchParams.get("genre") ?? (initialGenre || undefined),
            year: searchParams.get("year") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            sort: searchParams.get("sort") ?? undefined,
            page: searchParams.get("page") ?? undefined,
        };

        return searchQuerySchema.safeParse(raw);
    }, [searchParams, initialQuery, initialGenre]);

    const isInvalidSearch = !parsedQuery.success;
    const validationError = !parsedQuery.success
        ? parsedQuery.error.issues[0]?.message ?? "Invalid search filter parameters"
        : null;

    // ── Build typed search params for useSearch ──
    const searchConfig = useMemo<SearchParams>(() => {
        if (!parsedQuery.success) return {};
        const data = parsedQuery.data;
        const params: SearchParams = {};
        if (data.q) params.query = data.q;
        if (data.genre) params.genreIds = data.genre;
        if (data.year) params.year = data.year;
        if (data.status) params.status = data.status;
        if (data.sort) params.sort = data.sort;
        if (data.page) params.page = data.page;
        return params;
    }, [parsedQuery]);

    // ── Fetch search results (only when URL parameters are valid) ──
    const { data, isLoading } = useSearch(searchConfig, 350, {
        enabled: parsedQuery.success,
    });

    // ── Active filter summary for status bar ──
    const activeQuery = searchParams.get("q") ?? initialQuery;
    const activeGenre = searchParams.get("genre") ?? initialGenre;

    const filterTags = useMemo(() => {
        if (!parsedQuery.success) return [];
        const SORT_LABELS: Record<string, string> = {
            score: "Highest Score",
            popularity: "Most Popular",
            date: "Latest Release",
        };
        const tags: string[] = [];
        if (activeGenre) tags.push(`Genre: ${activeGenre}`);
        if (parsedQuery.data.year) tags.push(`Year: ${parsedQuery.data.year}`);
        if (parsedQuery.data.status) tags.push(`Status: ${parsedQuery.data.status}`);
        if (parsedQuery.data.sort && SORT_LABELS[parsedQuery.data.sort]) {
            tags.push(`Sort: ${SORT_LABELS[parsedQuery.data.sort]}`);
        }
        return tags;
    }, [activeGenre, parsedQuery]);

    const statusText = activeQuery
        ? `Results for "${activeQuery}"${filterTags.length > 0 ? ` (${filterTags.join(" · ")})` : ""}`
        : filterTags.length > 0
          ? `Filtered by: ${filterTags.join(" · ")}`
          : "Browsing all titles";

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
                            {isInvalidSearch ? (
                                <span style={{ color: "var(--accent-readable)" }}>
                                    {validationError}
                                </span>
                            ) : (
                                <>
                                    {statusText}
                                    {data && !isLoading && (
                                        <> — {data.total} result{data.total !== 1 ? "s" : ""}</>
                                    )}
                                </>
                            )}
                        </span>
                    </div>

                    {/* Results Grid or Invalid Filter State */}
                    {isInvalidSearch ? (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "48px 24px",
                                border: "1px solid var(--border)",
                                borderRadius: "12px",
                                backgroundColor: "var(--bg-card)",
                                textAlign: "center",
                                gap: "12px",
                            }}
                        >
                            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                                Invalid Search Filter
                            </p>
                            <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                                {validationError}
                            </p>
                            <Link
                                href={ROUTES.SEARCH}
                                style={{
                                    marginTop: "8px",
                                    padding: "8px 16px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    color: "var(--text)",
                                    backgroundColor: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "8px",
                                    textDecoration: "none",
                                }}
                            >
                                Reset Filters
                            </Link>
                        </div>
                    ) : (
                        <AnimeGrid isLoading={isLoading} anime={data?.data ?? []} />
                    )}
                </main>
            </div>
        </div>
    );
}

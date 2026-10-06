"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";
import { Pagination } from "@/modules/anime/components/Pagination";
import { SearchEmptyState } from "@/modules/anime/components/SearchEmptyState";
import { SearchErrorState } from "@/modules/anime/components/SearchErrorState";
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
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    // Parse & Validate raw URL query parameters via Zod
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

    // Build typed search params for useSearch
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

    // Fetch search results (only when URL parameters are valid)
    const { data, isLoading, isError, error, refetch, isFetching } = useSearch(
        searchConfig,
        350,
        { enabled: parsedQuery.success },
    );

    // Reset all filters handler
    const handleResetFilters = useCallback(() => {
        router.push(ROUTES.SEARCH);
    }, [router]);

    // Pagination Handler
    const handlePageChange = useCallback(
        (newPage: number) => {
            const next = new URLSearchParams(searchParams.toString());
            if (newPage > 1) {
                next.set("page", String(newPage));
            } else {
                next.delete("page");
            }
            const qs = next.toString();
            router.push(qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH);
            window.scrollTo({ top: 0, behavior: "smooth" });
        },
        [router, searchParams],
    );

    const totalPages = data
        ? Math.max(1, Math.ceil(data.total / (data.limit || 25)))
        : 1;

    // Active filter summary for status bar
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

    return (
        <div className="search-page-layout">
            {/* Search Header & Search Input Bar */}
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

            {/* Mobile Backdrop */}
            {mobileFilterOpen && (
                <div
                    className="search-backdrop"
                    onClick={() => setMobileFilterOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Main Two-Column Layout (Sidebar + Results) */}
            <div className="search-main-columns">
                {/* Filter Sidebar */}
                <FilterPanel
                    className={mobileFilterOpen ? "mobile-open" : ""}
                    onClose={() => setMobileFilterOpen(false)}
                />

                {/* Results Area */}
                <main className="search-results-area">
                    {/* Status Bar */}
                    <div className="search-results-bar">
                        <span className="search-results-count">
                            {isInvalidSearch ? (
                                <span style={{ color: "var(--accent-readable)" }}>
                                    {validationError}
                                </span>
                            ) : isError ? (
                                <span style={{ color: "var(--accent-readable)" }}>
                                    Unable to load anime catalog
                                </span>
                            ) : isLoading ? (
                                "Searching anime catalog..."
                            ) : isFetching ? (
                                "Updating results..."
                            ) : data ? (
                                data.total === 0 ? (
                                    "No matching titles found"
                                ) : (
                                    <>
                                        Found <strong>{data.total.toLocaleString()}</strong> anime
                                        {filterTags.length > 0
                                            ? ` (${filterTags.join(" · ")})`
                                            : " · Browsing all titles"}
                                        {totalPages > 1 && (
                                            <span style={{ opacity: 0.7, marginLeft: "6px" }}>
                                                · Page {data.page} of {totalPages}
                                            </span>
                                        )}
                                    </>
                                )
                            ) : (
                                "No results"
                            )}
                        </span>
                    </div>

                    {/* Results Content Area */}
                    {isInvalidSearch ? (
                        <div className="search-state-card" role="alert">
                            <div className="search-state-icon-wrapper search-state-icon-error">
                                <SlidersHorizontal size={30} />
                            </div>
                            <h3 className="search-state-title">Invalid Search Filter</h3>
                            <p className="search-state-desc">{validationError}</p>
                            <Link href={ROUTES.SEARCH} className="search-state-action-btn">
                                Reset Filters
                            </Link>
                        </div>
                    ) : isError ? (
                        <SearchErrorState
                            error={error}
                            onRetry={() => refetch()}
                            isRetrying={isFetching}
                        />
                    ) : !isLoading && !isFetching && data?.data.length === 0 ? (
                        <SearchEmptyState
                            query={searchParams.get("q") ?? initialQuery}
                            hasActiveFilters={filterTags.length > 0}
                            onReset={handleResetFilters}
                        />
                    ) : (
                        <>
                            <AnimeGrid isLoading={isLoading} anime={data?.data ?? []} />

                            {/* Pagination Controls */}
                            {data && data.data.length > 0 && (
                                <Pagination
                                    currentPage={data.page}
                                    totalPages={totalPages}
                                    hasNextPage={data.hasNextPage}
                                    onPageChange={handlePageChange}
                                />
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}

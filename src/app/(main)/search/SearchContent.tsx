"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";
import { Pagination } from "@/modules/anime/components/Pagination";
import { SearchEmptyState } from "@/modules/anime/components/SearchEmptyState";
import { SearchErrorState } from "@/modules/anime/components/SearchErrorState";
import { useSearch } from "@/modules/anime/queries/use-search";
import { searchQuerySchema } from "@/modules/anime/validations/search-schema";
import { GENRES } from "@/lib/constants/genres";
import { ROUTES } from "@/lib/constants/route";
import {
    STATUS_LABELS,
    SORT_LABELS,
    FILTER_PARAM_KEYS,
} from "@/lib/constants/search-filters";
import type { SearchParams } from "@/modules/anime/types";

const GENRE_SLUG_TO_NAME: Record<string, string> = Object.fromEntries(
    GENRES.map((g) => [g.slug, g.name]),
);

interface ActiveChip {
    id: string;
    label: string;
    keysToRemove: string[];
    /** For genre chips: remaining genre slugs after removal (so we update rather than delete). */
    genreRemainder?: string[];
}

/** Build URL string from search params. */
function buildSearchUrl(sp: URLSearchParams): string {
    const qs = sp.toString();
    return qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH;
}

/** Collect active filter chips from the current URL search params. */
function collectActiveChips(sp: URLSearchParams): ActiveChip[] {
    const chips: ActiveChip[] = [];

    // Genres — one chip per selected genre slug
    const rawGenre = sp.get("genre");
    if (rawGenre) {
        const slugs = rawGenre.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
        for (const slug of slugs) {
            chips.push({
                id: `genre-${slug}`,
                label: `Genre: ${GENRE_SLUG_TO_NAME[slug] ?? slug}`,
                keysToRemove: ["genre"],
                genreRemainder: slugs.filter((s) => s !== slug),
            });
        }
    }

    // Simple key→label mappings
    const simpleParams: {
        key: string;
        prefix: string;
        labels?: Record<string, string>;
        aliases?: string[];
    }[] = [
        { key: "year", prefix: "Year" },
        { key: "startDate", prefix: "From", aliases: ["start_date"] },
        { key: "endDate", prefix: "To", aliases: ["end_date"] },
        { key: "status", prefix: "Status", labels: STATUS_LABELS },
        { key: "sort", prefix: "Sort", labels: SORT_LABELS },
    ];

    for (const { key, prefix, labels, aliases } of simpleParams) {
        const value = sp.get(key) ?? (aliases ? aliases.reduce<string | null>((v, a) => v ?? sp.get(a), null) : null);
        if (value) {
            chips.push({
                id: `${key}-${value}`,
                label: `${prefix}: ${labels?.[value] ?? value}`,
                keysToRemove: [key, ...(aliases ?? [])],
            });
        }
    }

    return chips;
}

interface SearchContentProps {
    initialQuery?: string;
    initialGenre?: string;
}

export function SearchContent({
    initialQuery = "",
}: SearchContentProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isFilterOpen, setIsFilterOpen] = useState(true);

    // ── URL Validation (useSearchParams is the sole single source of truth) ──
    const parsedQuery = useMemo(() => {
        const raw = {
            q: searchParams.get("q") ?? undefined,
            genre: searchParams.get("genre") ?? undefined,
            year: searchParams.get("year") ?? undefined,
            startDate: searchParams.get("startDate") ?? searchParams.get("start_date") ?? undefined,
            endDate: searchParams.get("endDate") ?? searchParams.get("end_date") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            sort: searchParams.get("sort") ?? undefined,
            page: searchParams.get("page") ?? undefined,
        };
        return searchQuerySchema.safeParse(raw);
    }, [searchParams]);

    const isInvalidSearch = !parsedQuery.success;
    const validationError = isInvalidSearch
        ? parsedQuery.error.issues[0]?.message ?? "Invalid search filter parameters"
        : null;

    // ── Build typed SearchParams for the API hook ──
    const searchConfig = useMemo<SearchParams>(() => {
        if (!parsedQuery.success) return {};
        const d = parsedQuery.data;
        return {
            ...(d.q && { query: d.q }),
            ...(d.genre && { genreIds: d.genre }),
            ...(d.year && { year: d.year }),
            ...(d.startDate && { startDate: d.startDate }),
            ...(d.endDate && { endDate: d.endDate }),
            ...(d.status && { status: d.status }),
            ...(d.sort && { sort: d.sort }),
            ...(d.page && { page: d.page }),
        };
    }, [parsedQuery]);

    // ── Data fetching ──
    const { data, isLoading, isError, error, refetch, isFetching } = useSearch(
        searchConfig,
        350,
        { enabled: parsedQuery.success },
    );

    // ── Navigation helpers ──
    const navigateSearch = useCallback(
        (mutate: (sp: URLSearchParams) => void) => {
            const next = new URLSearchParams(searchParams.toString());
            mutate(next);
            router.push(buildSearchUrl(next));
        },
        [router, searchParams],
    );

    // Clear all filters while preserving search query `q`
    const handleClearAllFilters = useCallback(() => {
        navigateSearch((sp) => {
            for (const key of FILTER_PARAM_KEYS) {
                sp.delete(key);
            }
            sp.delete("page");
        });
    }, [navigateSearch]);

    const handlePageChange = useCallback(
        (newPage: number) => {
            navigateSearch((sp) => {
                if (newPage > 1) {
                    sp.set("page", String(newPage));
                } else {
                    sp.delete("page");
                }
            });
            window.scrollTo({ top: 0, behavior: "smooth" });
        },
        [navigateSearch],
    );

    // ── Active filter chips (derived solely from URL) ──
    const activeChips = useMemo(
        () => collectActiveChips(searchParams),
        [searchParams],
    );

    const removeChip = useCallback(
        (chip: ActiveChip) => {
            navigateSearch((sp) => {
                if (chip.genreRemainder !== undefined) {
                    if (chip.genreRemainder.length > 0) {
                        sp.set("genre", chip.genreRemainder.join(","));
                    } else {
                        sp.delete("genre");
                    }
                } else {
                    for (const key of chip.keysToRemove) {
                        sp.delete(key);
                    }
                }
                sp.delete("page");
            });
        },
        [navigateSearch],
    );

    // ── Derived display values ──
    const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 25))) : 1;

    // ── Status bar text ──
    const statusText = useMemo(() => {
        if (isInvalidSearch) return null;
        if (isError) return null;
        if (isLoading) return "Searching anime catalog...";
        if (isFetching) return "Updating results...";
        if (!data) return "No results";
        if (data.total === 0) return "No matching titles found";
        return null;
    }, [isInvalidSearch, isError, isLoading, isFetching, data]);

    return (
        <div className="search-page-layout">
            {/* Search Header */}
            <div className="search-header-container">
                <div className="search-header-text">
                    <h1 className="search-title">Explore Anime</h1>
                    <p className="search-subtitle">
                        Search by title, filter across 20+ genres, or discover seasonal staples.
                    </p>
                </div>
                <SearchBar defaultValue={initialQuery} />
            </div>

            {/* Top-Level Filter Panel (batch / staged filtering) */}
            <FilterPanel
                isOpen={isFilterOpen}
                onToggle={() => setIsFilterOpen((prev) => !prev)}
                onApply={() => setIsFilterOpen(false)}
            />

            {/* Active Filter Chips */}
            {activeChips.length > 0 && (
                <div className="active-filters-bar" aria-label="Active filters">
                    <span className="active-filters-label">Active Filters:</span>
                    <div className="active-filters-chips-wrap">
                        {activeChips.map((chip) => (
                            <button
                                key={chip.id}
                                type="button"
                                onClick={() => removeChip(chip)}
                                className="active-filter-chip"
                                title={`Remove ${chip.label}`}
                            >
                                <span>{chip.label}</span>
                                <X size={13} className="active-filter-chip-remove" />
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="active-filters-clear-all"
                        >
                            Clear All
                        </button>
                    </div>
                </div>
            )}

            {/* Results */}
            <main className="search-results-area">
                {/* Status Bar */}
                <div className="search-results-bar">
                    <span className="search-results-count">
                        {isInvalidSearch ? (
                            <span style={{ color: "var(--accent-readable)" }}>{validationError}</span>
                        ) : isError ? (
                            <span style={{ color: "var(--accent-readable)" }}>Unable to load anime catalog</span>
                        ) : statusText ? (
                            statusText
                        ) : data && data.total > 0 ? (
                            <>
                                Found <strong>{data.total.toLocaleString()}</strong> anime
                                {totalPages > 1 && (
                                    <span style={{ opacity: 0.7, marginLeft: "6px" }}>
                                        · Page {data.page} of {totalPages}
                                    </span>
                                )}
                            </>
                        ) : (
                            "No results"
                        )}
                    </span>
                </div>

                {/* Content */}
                {isInvalidSearch ? (
                    <div className="search-state-card" role="alert">
                        <div className="search-state-icon-wrapper search-state-icon-error">
                            <SlidersHorizontal size={30} />
                        </div>
                        <h3 className="search-state-title">Invalid Search Filter</h3>
                        <p className="search-state-desc">{validationError}</p>
                        <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="search-state-action-btn"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : isError ? (
                    <SearchErrorState
                        error={error}
                        onRetry={() => refetch()}
                        isRetrying={isFetching}
                    />
                ) : !isLoading && !isFetching && data?.data.length === 0 ? (
                    <SearchEmptyState
                        query={searchParams.get("q") ?? ""}
                        hasActiveFilters={activeChips.length > 0}
                        onReset={handleClearAllFilters}
                    />
                ) : (
                    <>
                        <AnimeGrid isLoading={isLoading} anime={data?.data ?? []} />

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
    );
}

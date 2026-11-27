"use client";

import { useMemo, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, EyeOff, Shuffle, SlidersHorizontal, X } from "lucide-react";

import { AiFinderNote } from "@/components/shared/AiFinderNote";
import { useSession } from "@/lib/auth-client";
import { useBookmarkStatuses } from "@/modules/bookmarks";
import { useHideCompleted } from "@/modules/anime/utils/hide-completed";
import { shuffleShelf, useLandingShelf } from "@/modules/anime/utils/search-shelves";
import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";
import { SearchBar } from "@/modules/anime/components/SearchBar";
import { FilterPanel } from "@/modules/anime/components/FilterPanel";
import { Pagination } from "@/modules/anime/components/Pagination";
import { SearchEmptyState } from "@/modules/anime/components/SearchEmptyState";
import { SearchErrorState } from "@/modules/anime/components/SearchErrorState";
import { useSearch } from "@/modules/anime/queries/use-search";
import { searchQuerySchema } from "@/modules/anime/validations/search-schema";
import { setSearchUrl } from "@/modules/anime/utils/search-url";
import { GENRES } from "@/lib/constants/genres";
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
    // For genre chips: remaining genre slugs after removal (so we update rather than delete). */
    genreRemainder?: string[];
}

// Collect active filter chips from the current URL search params. */
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


//Client-side search UI. The URL is the single source of truth, read via
// useSearchParams(). The parent page is static and wraps this in <Suspense>.

export function SearchContent() {
    const searchParams = useSearchParams();
    // Collapsed by default: on phones the open panel pushed results off
    // screen. Active filters still show as chips and as a count in the header.
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const closeFilters = useCallback(() => setIsFilterOpen(false), []);

    // URL Validation (useSearchParams is the sole single source of truth)
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

    // Build typed SearchParams for the API hook
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

    // No query, no filters, no page: show a random landing shelf instead of
    // the same default list every visit (see utils/search-shelves).
    // The schema defaults `page` to 1, so ignore it unless it's in the URL.
    const isLanding =
        parsedQuery.success &&
        !searchParams.has("page") &&
        Object.keys(searchConfig).every((key) => key === "page");
    const shelf = useLandingShelf();
    const activeShelf = isLanding ? shelf : null;
    const isWaitingForShelf = isLanding && !shelf;

    // Data fetching
    const { data, isLoading, isError, error, refetch, isFetching } = useSearch(
        activeShelf?.search ?? searchConfig,
        350,
        { enabled: parsedQuery.success && !isWaitingForShelf },
    );
    const showSkeleton = isLoading || isWaitingForShelf;

    // Navigation helpers
    const navigateSearch = useCallback(
        (mutate: (sp: URLSearchParams) => void) => {
            const next = new URLSearchParams(searchParams.toString());
            mutate(next);
            setSearchUrl(next, "push");
        },
        [searchParams],
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

    // Active filter chips (derived solely from URL)
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

    // "Hide completed": signed-in users only. The bookmark map is fetched
    // only while the switch is on; filtering happens here on the client, so
    // /search and /api/anime stay CDN-cached. "Show" reveals them for this
    // exact search only (a new query or page hides them again).
    const { data: session } = useSession();
    const isSignedIn = !!session?.user;
    const [hideCompleted, setHideCompleted] = useHideCompleted();
    const isHiding = isSignedIn && hideCompleted;
    const { data: statuses } = useBookmarkStatuses({ enabled: isHiding });
    const searchKey = activeShelf ? `shelf:${activeShelf.id}` : searchParams.toString();
    const [revealedFor, setRevealedFor] = useState<string | null>(null);

    const { visibleAnime, hiddenAnime } = useMemo(() => {
        const all = data?.data ?? [];
        if (!isHiding || !statuses || revealedFor === searchKey) {
            return { visibleAnime: all, hiddenAnime: [] };
        }
        const hidden = all.filter((a) => statuses[a.id] === "completed");
        if (hidden.length === 0) return { visibleAnime: all, hiddenAnime: [] };
        return { visibleAnime: all.filter((a) => statuses[a.id] !== "completed"), hiddenAnime: hidden };
    }, [data, isHiding, statuses, revealedFor, searchKey]);

    // Derived display values
    const totalPages = data ? Math.max(1, Math.ceil(data.total / (data.limit || 25))) : 1;

    // Status bar text
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
                <AiFinderNote query={searchParams.get("q") ?? ""} />
                <SearchBar onActivate={closeFilters} isSearching={isFetching} />
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
                    {activeShelf ? (
                        <div className="search-shelf-head">
                            <h2 className="search-shelf-title">{activeShelf.title}</h2>
                            <p className="search-shelf-sub">{activeShelf.subtitle}</p>
                        </div>
                    ) : (
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
                    )}
                    <div className="search-results-actions">
                        {activeShelf && (
                            <button type="button" className="search-shuffle-btn" onClick={shuffleShelf}>
                                <Shuffle size={14} aria-hidden="true" />
                                Shuffle
                            </button>
                        )}
                        {isSignedIn && (
                            <label className="search-hide-toggle">
                                <input
                                    type="checkbox"
                                    role="switch"
                                    checked={hideCompleted}
                                    onChange={(e) => setHideCompleted(e.target.checked)}
                                    className="search-hide-toggle-input"
                                />
                                <span className="search-hide-toggle-track" aria-hidden="true" />
                                Hide completed
                            </label>
                        )}
                    </div>
                </div>

                {hiddenAnime.length > 0 && (
                    <p className="search-hidden-note" role="status">
                        <EyeOff size={15} aria-hidden="true" className="search-hidden-note-icon" />
                        <span>
                            {hiddenAnime.length === 1 ? (
                                <>
                                    <strong>{hiddenAnime[0].title}</strong> is in your Completed list.
                                </>
                            ) : (
                                <>
                                    {hiddenAnime.length} results are in your Completed list.
                                </>
                            )}
                        </span>
                        <button
                            type="button"
                            className="search-hidden-note-btn"
                            onClick={() => setRevealedFor(searchKey)}
                        >
                            {hiddenAnime.length === 1 ? "Show it" : "Show them"}
                        </button>
                    </p>
                )}

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
                        {/* Whole page hidden: the note above says why, so no empty grid. */}
                        {(showSkeleton || visibleAnime.length > 0) && (
                            <AnimeGrid isLoading={showSkeleton} anime={visibleAnime} eagerCount={5} />
                        )}

                        {activeShelf && data && data.data.length > 0 ? (
                            // No pagination on a shelf: "See all" turns it into a normal
                            // search (filters in the URL, with pagination). History API,
                            // like every other control here, so no navigation request.
                            <button
                                type="button"
                                className="search-shelf-more"
                                onClick={() => {
                                    setSearchUrl(new URLSearchParams(activeShelf.query), "push");
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                            >
                                See all: {activeShelf.title}
                                <ArrowRight size={15} aria-hidden="true" />
                            </button>
                        ) : data && data.data.length > 0 && (
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

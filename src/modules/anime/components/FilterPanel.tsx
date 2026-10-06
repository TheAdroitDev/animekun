"use client";

import { useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, RotateCcw, Check } from "lucide-react";

import { GENRES } from "@/lib/constants/genres";
import { ROUTES } from "@/lib/constants/route";

interface FilterPanelProps {
    onClose?: () => void;
    className?: string;
}

export const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Airing", value: "airing" },
    { label: "Completed", value: "complete" },
    { label: "Upcoming", value: "upcoming" },
] as const;

export const SORT_OPTIONS = [
    { label: "Default", value: "" },
    { label: "Highest Score", value: "score" },
    { label: "Most Popular", value: "popularity" },
    { label: "Latest Release", value: "date" },
] as const;

// Contiguous years from current year down to 1990
const currentYear = new Date().getFullYear();

const years: { label: string; value: string }[] = [{ label: "All Years", value: "" }];

for (let y = currentYear; y >= 1990; y--) {
    years.push({ label: String(y), value: String(y) });
}
export const YEAR_OPTIONS = years;

export function FilterPanel({ onClose, className = "" }: FilterPanelProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Parse active state from URL params
    const selectedGenres = useMemo(() => {
        const raw = searchParams.get("genre");
        if (!raw) return new Set<string>();
        return new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
    }, [searchParams]);

    const selectedYear = searchParams.get("year") ?? "";
    const selectedStatus = searchParams.get("status") ?? "";
    const selectedSort = searchParams.get("sort") ?? "";

    // Count active filters (excluding search query)
    const activeFiltersCount = useMemo(() => {
        let count = selectedGenres.size;
        if (selectedYear) count += 1;
        if (selectedStatus) count += 1;
        if (selectedSort) count += 1;
        return count;
    }, [selectedGenres, selectedYear, selectedStatus, selectedSort]);

    // Helper to update URL params and reset page to 1
    const updateParams = useCallback(
        (updater: (params: URLSearchParams) => void) => {
            const next = new URLSearchParams(searchParams.toString());
            updater(next);
            next.delete("page"); // Reset to page 1 on filter modification

            const qs = next.toString();
            router.push(qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH);
        },
        [router, searchParams],
    );

    // Toggle a genre on/off
    const toggleGenre = (slug: string) => {
        updateParams((params) => {
            const current = new Set(selectedGenres);
            if (current.has(slug)) {
                current.delete(slug);
            } else {
                current.add(slug);
            }

            if (current.size > 0) {
                params.set("genre", Array.from(current).join(","));
            } else {
                params.delete("genre");
            }
        });
    };

    // Change single-value filters
    const handleYearChange = (year: string) => {
        updateParams((params) => {
            if (year) {
                params.set("year", year);
            } else {
                params.delete("year");
            }
        });
    };

    const handleStatusChange = (status: string) => {
        updateParams((params) => {
            if (status) {
                params.set("status", status);
            } else {
                params.delete("status");
            }
        });
    };

    const handleSortChange = (sort: string) => {
        updateParams((params) => {
            if (sort) {
                params.set("sort", sort);
            } else {
                params.delete("sort");
            }
        });
    };

    // Reset all filters (preserves active search query)
    const handleResetAll = () => {
        updateParams((params) => {
            params.delete("genre");
            params.delete("year");
            params.delete("status");
            params.delete("sort");
        });
    };

    return (
        <aside className={`search-sidebar ${className}`} aria-label="Anime search filters">
            {/* ── Sidebar Header ── */}
            <div className="search-sidebar-header">
                <div className="search-sidebar-header-left">
                    <h2 className="search-sidebar-title">Filters</h2>
                    {activeFiltersCount > 0 && (
                        <span className="search-sidebar-badge">{activeFiltersCount}</span>
                    )}
                </div>

                <div className="search-sidebar-header-right">
                    {activeFiltersCount > 0 && (
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="search-sidebar-reset-btn"
                            title="Reset all filters"
                        >
                            <RotateCcw size={13} />
                            <span>Reset</span>
                        </button>
                    )}

                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="search-sidebar-close-btn"
                            aria-label="Close filters drawer"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Sort By Filter ── */}
            <div className="search-filter-section">
                <label htmlFor="search-sort-select" className="search-filter-heading">
                    Sort By
                </label>
                <div className="search-filter-select-wrapper">
                    <select
                        id="search-sort-select"
                        value={selectedSort}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="search-filter-select"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Status Filter (Pills) ── */}
            <div className="search-filter-section">
                <span className="search-filter-heading">Airing Status</span>
                <div className="search-status-pills">
                    {STATUS_OPTIONS.map((opt) => {
                        const isActive = selectedStatus === opt.value;
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleStatusChange(opt.value)}
                                className={`search-status-pill ${isActive ? "active" : ""}`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Year Filter (Select) ── */}
            <div className="search-filter-section">
                <label htmlFor="search-year-select" className="search-filter-heading">
                    Release Year
                </label>
                <div className="search-filter-select-wrapper">
                    <select
                        id="search-year-select"
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="search-filter-select"
                    >
                        {YEAR_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Genres Multi-Select (Checkboxes/Badges) ── */}
            <div className="search-filter-section">
                <div className="search-filter-heading-row">
                    <span className="search-filter-heading">Genres</span>
                    {selectedGenres.size > 0 && (
                        <span className="search-filter-count">{selectedGenres.size} selected</span>
                    )}
                </div>

                <div className="search-genre-checkbox-grid">
                    {GENRES.map((g) => {
                        const isChecked = selectedGenres.has(g.slug);
                        return (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => toggleGenre(g.slug)}
                                className={`search-genre-checkbox-item ${isChecked ? "checked" : ""}`}
                                role="checkbox"
                                aria-checked={isChecked}
                            >
                                <span className={`search-checkbox-box ${isChecked ? "checked" : ""}`}>
                                    {isChecked && <Check size={11} strokeWidth={3} />}
                                </span>
                                <span className="search-checkbox-label">{g.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}

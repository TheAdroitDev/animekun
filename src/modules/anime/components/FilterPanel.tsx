"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Check, Filter, ChevronDown, ChevronUp } from "lucide-react";

import { GENRES } from "@/lib/constants/genres";
import { ROUTES } from "@/lib/constants/route";
import {
    STATUS_OPTIONS,
    SORT_OPTIONS,
    YEAR_OPTIONS,
} from "@/lib/constants/search-filters";

// Re-export shared options for backward compatibility
export { STATUS_OPTIONS, SORT_OPTIONS, YEAR_OPTIONS };

interface DraftState {
    genres: Set<string>;
    year: string;
    startDate: string;
    endDate: string;
    status: string;
    sort: string;
}

interface FilterPanelProps {
    className?: string;
    isOpen?: boolean;
    onToggle?: () => void;
    onApply?: () => void;
}

// Read URL values into a DraftState snapshot.
function readUrlDraft(sp: URLSearchParams): DraftState {
    const raw = sp.get("genre");
    return {
        genres: raw
            ? new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))
            : new Set(),
        year: sp.get("year") ?? "",
        startDate: sp.get("startDate") ?? sp.get("start_date") ?? "",
        endDate: sp.get("endDate") ?? sp.get("end_date") ?? "",
        status: sp.get("status") ?? "",
        sort: sp.get("sort") ?? "",
    };
}

function FilterSelect({
    id,
    label,
    value,
    onChange,
    options,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: readonly { label: string; value: string }[];
}) {
    return (
        <div className="top-filter-field">
            <label htmlFor={id} className="top-filter-label">
                {label}
            </label>
            <div className="top-filter-select-wrapper">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="top-filter-select"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export function FilterPanel({ className = "", isOpen = true, onToggle, onApply }: FilterPanelProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Fingerprint of ONLY the applied filter parameters in the URL.
    // Changes to unrelated query parameters (such as `q` or `page`) do NOT alter this value.
    const appliedFilterFingerprint = useMemo(() => {
        const genre = searchParams.get("genre") ?? "";
        const year = searchParams.get("year") ?? "";
        const startDate = searchParams.get("startDate") ?? searchParams.get("start_date") ?? "";
        const endDate = searchParams.get("endDate") ?? searchParams.get("end_date") ?? "";
        const status = searchParams.get("status") ?? "";
        const sort = searchParams.get("sort") ?? "";
        return `${genre}|${year}|${startDate}|${endDate}|${status}|${sort}`;
    }, [searchParams]);

    // Local draft state — zero API requests until "Apply Filters" is clicked
    const [draft, setDraft] = useState<DraftState>(() => readUrlDraft(searchParams));
    const [timingMode, setTimingMode] = useState<"year" | "range">(() => {
        const initial = readUrlDraft(searchParams);
        return initial.startDate || initial.endDate ? "range" : "year";
    });

    // Synchronize draft state ONLY when applied filter parameters change in the URL.
    // Unrelated changes like `q` or `page` will NOT reset unapplied draft edits.
    const [prevFingerprint, setPrevFingerprint] = useState(appliedFilterFingerprint);
    if (prevFingerprint !== appliedFilterFingerprint) {
        setPrevFingerprint(appliedFilterFingerprint);
        const latestFromUrl = readUrlDraft(searchParams);
        setDraft(latestFromUrl);
        setTimingMode(latestFromUrl.startDate || latestFromUrl.endDate ? "range" : "year");
    }

    const updateDraft = useCallback(<K extends keyof DraftState>(key: K, value: DraftState[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }, []);

    const toggleGenre = useCallback((slug: string) => {
        setDraft((prev) => {
            const next = new Set(prev.genres);
            if (next.has(slug)) {
                next.delete(slug);
            } else {
                next.add(slug);
            }
            return { ...prev, genres: next };
        });
    }, []);

    // Count of active draft selections (for header badge)
    const draftCount = useMemo(() => {
        let n = draft.genres.size;
        if (timingMode === "year" && draft.year) n++;
        if (timingMode === "range") {
            if (draft.startDate) n++;
            if (draft.endDate) n++;
        }
        if (draft.status) n++;
        if (draft.sort) n++;
        return n;
    }, [draft, timingMode]);

    // Client-side date range validation
    const isDateRangeInvalid = useMemo(() => {
        if (timingMode !== "range") return false;
        if (draft.startDate && draft.endDate) {
            return draft.startDate > draft.endDate;
        }
        return false;
    }, [timingMode, draft.startDate, draft.endDate]);

    // Commit all draft filters to URL at once (Single API Call)
    const handleApply = useCallback(() => {
        if (isDateRangeInvalid) return;

        const next = new URLSearchParams(searchParams.toString());

        // Genres
        if (draft.genres.size > 0) {
            next.set("genre", Array.from(draft.genres).join(","));
        } else {
            next.delete("genre");
        }

        // Timing — always clean aliases to avoid duplicate URL params
        if (timingMode === "year") {
            if (draft.year) {
                next.set("year", draft.year);
            } else {
                next.delete("year");
            }
            next.delete("startDate");
            next.delete("start_date");
            next.delete("endDate");
            next.delete("end_date");
        } else {
            next.delete("year");
            if (draft.startDate) {
                next.set("startDate", draft.startDate);
            } else {
                next.delete("startDate");
            }
            next.delete("start_date");

            if (draft.endDate) {
                next.set("endDate", draft.endDate);
            } else {
                next.delete("endDate");
            }
            next.delete("end_date");
        }

        // Status
        if (draft.status) {
            next.set("status", draft.status);
        } else {
            next.delete("status");
        }

        // Sort
        if (draft.sort) {
            next.set("sort", draft.sort);
        } else {
            next.delete("sort");
        }

        // Reset pagination on filter change
        next.delete("page");

        const qs = next.toString();
        router.push(qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH);

        // Auto-collapse filter options after applying so the anime results are immediately visible
        if (onApply) {
            onApply();
        } else if (onToggle && isOpen) {
            onToggle();
        }
    }, [searchParams, draft, timingMode, isDateRangeInvalid, router, onApply, onToggle, isOpen]);

    // Reset All clears draft filters locally without triggering an API request until Apply is clicked
    const handleReset = useCallback(() => {
        setDraft({
            genres: new Set(),
            year: "",
            startDate: "",
            endDate: "",
            status: "",
            sort: "",
        });
        setTimingMode("year");
    }, []);

    return (
        <section
            className={`top-filter-panel ${className}`}
            aria-label="Anime search filter options"
        >
            {/* Header / Toggle Bar */}
            <div className="top-filter-header">
                <div className="top-filter-header-left">
                    <Filter size={17} className="top-filter-header-icon" />
                    <span className="top-filter-title">Filter Options</span>
                    {draftCount > 0 && (
                        <span className="top-filter-count-badge" aria-label={`${draftCount} filters selected`}>
                            <span className="count-badge-number">{draftCount}</span>
                            <span className="count-badge-text"> selected</span>
                        </span>
                    )}
                </div>

                <div className="top-filter-header-right">
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="top-filter-toggle-btn"
                            aria-expanded={isOpen}
                        >
                            <span className="toggle-btn-label-desktop">
                                {isOpen ? "Hide Filters" : "Show Filters"}
                            </span>
                            <span className="toggle-btn-label-mobile">
                                {isOpen ? "Hide" : "Filters"}
                            </span>
                            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Controls Body */}
            {isOpen && (
                <div className="top-filter-body">
                    {/* Row 1: Dropdowns & Timing */}
                    <div className="top-filter-controls-grid">
                        <FilterSelect
                            id="filter-sort-select"
                            label="Sort By"
                            value={draft.sort}
                            onChange={(v) => updateDraft("sort", v)}
                            options={SORT_OPTIONS}
                        />

                        <FilterSelect
                            id="filter-status-select"
                            label="Status"
                            value={draft.status}
                            onChange={(v) => updateDraft("status", v)}
                            options={STATUS_OPTIONS}
                        />

                        {/* Release Timing (Year vs Date Range) */}
                        <div className="top-filter-field timing-field">
                            <div className="top-filter-label-row">
                                <span className="top-filter-label">Release Timing</span>
                                <div className="timing-mode-toggle">
                                    {(["year", "range"] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            type="button"
                                            onClick={() => setTimingMode(mode)}
                                            className={`timing-mode-btn ${timingMode === mode ? "active" : ""}`}
                                        >
                                            {mode === "year" ? "Year" : "Date Range"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {timingMode === "year" ? (
                                <div className="top-filter-select-wrapper">
                                    <select
                                        id="filter-year-select"
                                        value={draft.year}
                                        onChange={(e) => updateDraft("year", e.target.value)}
                                        className="top-filter-select"
                                    >
                                        {YEAR_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="timing-range-wrapper">
                                    <div className="timing-range-inputs">
                                        <input
                                            type="date"
                                            value={draft.startDate}
                                            min="1900-01-01"
                                            max={draft.endDate || "2100-12-31"}
                                            onChange={(e) => updateDraft("startDate", e.target.value)}
                                            className={`top-filter-date-input ${isDateRangeInvalid ? "input-error" : ""}`}
                                            aria-label="Start date"
                                            aria-invalid={isDateRangeInvalid}
                                        />
                                        <span className="timing-range-separator">to</span>
                                        <input
                                            type="date"
                                            value={draft.endDate}
                                            min={draft.startDate || "1900-01-01"}
                                            max="2100-12-31"
                                            onChange={(e) => updateDraft("endDate", e.target.value)}
                                            className={`top-filter-date-input ${isDateRangeInvalid ? "input-error" : ""}`}
                                            aria-label="End date"
                                            aria-invalid={isDateRangeInvalid}
                                        />
                                    </div>
                                    {isDateRangeInvalid && (
                                        <span className="top-filter-field-error" role="alert">
                                            Start date cannot be after end date
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Genres Grid */}
                    <div className="top-filter-genres-section">
                        <div className="top-filter-genres-heading">
                            <span className="top-filter-label">Genres</span>
                            {draft.genres.size > 0 && (
                                <span className="top-filter-count-badge">
                                    {draft.genres.size} selected
                                </span>
                            )}
                        </div>

                        <div className="top-filter-genres-grid">
                            {GENRES.map((g) => {
                                const checked = draft.genres.has(g.slug);
                                return (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => toggleGenre(g.slug)}
                                        className={`top-genre-chip ${checked ? "active" : ""}`}
                                        role="checkbox"
                                        aria-checked={checked}
                                    >
                                        <span className={`top-genre-checkbox ${checked ? "checked" : ""}`}>
                                            {checked && <Check size={11} strokeWidth={3} />}
                                        </span>
                                        <span className="top-genre-name">{g.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 3: Action Buttons */}
                    <div className="top-filter-actions-bar">
                        <button
                            type="button"
                            onClick={handleApply}
                            disabled={isDateRangeInvalid}
                            className="top-filter-apply-btn"
                            title={isDateRangeInvalid ? "Please fix invalid date range before applying" : undefined}
                        >
                            <Filter size={15} />
                            <span>Apply Filters{draftCount > 0 ? ` (${draftCount})` : ""}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleReset}
                            className="top-filter-reset-btn"
                        >
                            <RotateCcw size={14} />
                            <span>Reset All</span>
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

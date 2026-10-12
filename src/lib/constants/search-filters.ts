// Shared search filter constants, values, options, and display labels.
// Single source of truth for AnimeKun search filters.

export const STATUS_VALUES = ["airing", "complete", "upcoming"] as const;
export type SearchStatus = (typeof STATUS_VALUES)[number];

export const STATUS_OPTIONS = [
    { label: "All Statuses", value: "" },
    { label: "Airing", value: "airing" },
    { label: "Completed", value: "complete" },
    { label: "Upcoming", value: "upcoming" },
] as const;

export const STATUS_LABELS: Record<SearchStatus, string> = {
    airing: "Airing",
    complete: "Completed",
    upcoming: "Upcoming",
};

// Sorting 

export const SORT_VALUES = ["score", "popularity", "date", "title"] as const;
export type SearchSort = (typeof SORT_VALUES)[number];

export const SORT_OPTIONS = [
    { label: "Default", value: "" },
    { label: "Highest Score", value: "score" },
    { label: "Most Popular", value: "popularity" },
    { label: "Latest Release", value: "date" },
    { label: "Alphabetical (A-Z)", value: "title" },
] as const;

export const SORT_LABELS: Record<SearchSort, string> = {
    score: "Highest Score",
    popularity: "Most Popular",
    date: "Latest Release",
    title: "Alphabetical (A-Z)",
};

// Release Year Options

const currentYear = new Date().getFullYear();
export const YEAR_OPTIONS = [
    { label: "All Years", value: "" },
    ...Array.from({ length: currentYear - 1990 + 1 }, (_, i) => {
        const y = String(currentYear - i);
        return { label: y, value: y };
    }),
] as const;

// Filter Parameter Keys (for URL filtering, syncing, and clearing)
export const FILTER_PARAM_KEYS = [
    "genre",
    "year",
    "startDate",
    "start_date",
    "endDate",
    "end_date",
    "status",
    "sort",
] as const;

"use client";

import Link from "next/link";
import { SearchX, RotateCcw } from "lucide-react";
import { ROUTES } from "@/lib/constants/route";

interface SearchEmptyStateProps {
    query?: string;
    hasActiveFilters?: boolean;
    onReset?: () => void;
}

export function SearchEmptyState({
    query,
    hasActiveFilters,
    onReset,
}: SearchEmptyStateProps) {
    return (
        <div className="search-state-card" role="status">
            <div className="search-state-icon-wrapper">
                <SearchX size={32} className="search-state-icon" />
            </div>

            <h3 className="search-state-title">No Anime Found</h3>

            <p className="search-state-desc">
                {query
                    ? `We couldn't find any titles matching "${query}".`
                    : "No anime match your currently selected filter criteria."}
            </p>

            <div className="search-state-suggestions">
                <p className="search-suggestions-title">Suggestions to broaden your results:</p>
                <ul className="search-suggestions-list">
                    <li>Check for typos or try searching with alternative Romaji/English names</li>
                    <li>Remove specific release year or airing status constraints</li>
                    <li>Deselect niche genre combinations that may have zero overlap</li>
                </ul>
            </div>

            {(hasActiveFilters || query) && (
                onReset ? (
                    <button
                        type="button"
                        onClick={onReset}
                        className="search-state-action-btn"
                    >
                        <RotateCcw size={15} />
                        <span>Clear All Filters</span>
                    </button>
                ) : (
                    <Link href={ROUTES.SEARCH} className="search-state-action-btn">
                        <RotateCcw size={15} />
                        <span>Clear All Filters</span>
                    </Link>
                )
            )}
        </div>
    );
}

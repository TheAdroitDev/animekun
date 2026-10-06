"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface SearchErrorStateProps {
    error?: Error | null;
    onRetry: () => void;
    isRetrying?: boolean;
}

export function SearchErrorState({
    error,
    onRetry,
    isRetrying = false,
}: SearchErrorStateProps) {
    return (
        <div className="search-state-card search-state-error" role="alert">
            <div className="search-state-icon-wrapper search-state-icon-error">
                <AlertTriangle size={32} className="search-state-icon" />
            </div>

            <h3 className="search-state-title">Unable to Load Anime</h3>

            <p className="search-state-desc">
                {error?.message ||
                    "An unexpected error occurred while fetching anime. Please check your connection and try again."}
            </p>

            <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="search-state-action-btn search-state-retry-btn"
            >
                <RotateCcw
                    size={15}
                    className={isRetrying ? "search-spin-icon" : ""}
                />
                <span>{isRetrying ? "Retrying..." : "Retry Search"}</span>
            </button>
        </div>
    );
}

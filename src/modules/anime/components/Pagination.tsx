"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    onPageChange: (page: number) => void;
    className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [
            1,
            "...",
            totalPages - 4,
            totalPages - 3,
            totalPages - 2,
            totalPages - 1,
            totalPages,
        ];
    }

    return [
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
    ];
}

export function Pagination({
    currentPage,
    totalPages,
    hasNextPage,
    onPageChange,
    className = "",
}: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    const pages = getPageNumbers(currentPage, totalPages);
    const hasPrev = currentPage > 1;
    const hasNext = hasNextPage || currentPage < totalPages;

    return (
        <nav
            aria-label="Anime search pagination"
            className={`search-pagination ${className}`}
        >
            {/* Previous Page Button */}
            <button
                type="button"
                className="pagination-btn pagination-prev-btn"
                disabled={!hasPrev}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Go to previous page"
            >
                <ChevronLeft size={16} />
                <span className="pagination-btn-label">Prev</span>
            </button>

            {/* Desktop Numbered Page Buttons */}
            <div className="pagination-numbers" role="list">
                {pages.map((item, index) => {
                    if (item === "...") {
                        return (
                            <span
                                key={`ellipsis-${index}`}
                                className="pagination-ellipsis"
                                aria-hidden="true"
                            >
                                …
                            </span>
                        );
                    }

                    const isCurrent = item === currentPage;
                    return (
                        <button
                            key={item}
                            type="button"
                            className={`pagination-number-btn ${isCurrent ? "active" : ""}`}
                            onClick={() => onPageChange(item)}
                            aria-label={`Page ${item}`}
                            aria-current={isCurrent ? "page" : undefined}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>

            {/* Mobile Compact Page Indicator */}
            <span className="pagination-mobile-info" aria-live="polite">
                Page {currentPage} of {totalPages}
            </span>

            {/* Next Page Button */}
            <button
                type="button"
                className="pagination-btn pagination-next-btn"
                disabled={!hasNext}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Go to next page"
            >
                <span className="pagination-btn-label">Next</span>
                <ChevronRight size={16} />
            </button>
        </nav>
    );
}

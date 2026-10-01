"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

import { ROUTES } from "@/lib/constants/route";

interface SearchBarProps {
    defaultValue?: string;
    placeholder?: string;
    debounceMs?: number;
    className?: string;
    autoFocus?: boolean;
    onSearch?: (query: string) => void;
}

export function SearchBar({
    defaultValue = "",
    placeholder = "Search anime by title, studio, or keyword...",
    debounceMs = 300,
    className = "",
    autoFocus = false,
    onSearch,
}: SearchBarProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const paramQuery = searchParams.get("q") ?? defaultValue;
    const [inputValue, setInputValue] = useState(paramQuery);
    const isMounted = useRef(false);

    // Sync input when URL param changes externally (e.g. browser back/forward or clear)
    useEffect(() => {
        setInputValue(paramQuery);
    }, [paramQuery]);

    const updateUrlQuery = useCallback(
        (val: string) => {
            const currentParams = new URLSearchParams(searchParams.toString());
            const trimmed = val.trim();

            if (trimmed) {
                currentParams.set("q", trimmed);
            } else {
                currentParams.delete("q");
            }

            // Reset to page 1 whenever search query changes
            currentParams.delete("page");

            const queryString = currentParams.toString();
            const targetUrl = queryString ? `${ROUTES.SEARCH}?${queryString}` : ROUTES.SEARCH;

            router.push(targetUrl);
            onSearch?.(trimmed);
        },
        [router, searchParams, onSearch],
    );

    // Debounced URL update when typing
    useEffect(() => {
        // Skip on initial mount so we don't trigger an unnecessary navigation
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }

        // Only debounce if the local value differs from the URL param
        if (inputValue.trim() === paramQuery.trim()) {
            return;
        }

        const timer = setTimeout(() => {
            updateUrlQuery(inputValue);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [inputValue, debounceMs, paramQuery, updateUrlQuery]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateUrlQuery(inputValue);
    };

    const handleClear = () => {
        setInputValue("");
        updateUrlQuery("");
    };

    return (
        <form
            role="search"
            onSubmit={handleSubmit}
            className={`search-input-form ${className}`}
        >
            <div className="search-input-wrapper">
                <HugeiconsIcon
                    icon={Search01Icon}
                    size={18}
                    strokeWidth={1.8}
                    className="search-input-icon"
                />

                <input
                    type="search"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={placeholder}
                    className="search-input-field"
                    autoFocus={autoFocus}
                    aria-label="Search anime"
                    autoComplete="off"
                    spellCheck="false"
                />

                {inputValue.length > 0 && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="search-clear-btn"
                        aria-label="Clear search query"
                        title="Clear search"
                    >
                        <HugeiconsIcon
                            icon={Cancel01Icon}
                            size={16}
                            strokeWidth={2}
                        />
                    </button>
                )}
            </div>

            <button type="submit" className="search-submit-btn">
                Search
            </button>
        </form>
    );
}

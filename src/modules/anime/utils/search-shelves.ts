"use client";

import { useEffect, useSyncExternalStore } from "react";

import { GENRES } from "@/lib/constants/genres";
import type { SearchParams } from "@/modules/anime/types";

/**
 * Landing shelves for /search with no query and no filters: one is picked at
 * random on each visit, so the page doesn't always show the same anime.
 *
 * Cost: every shelf is an ordinary /api/anime URL from a small fixed set, so
 * the CDN serves them from cache. The pick happens in the browser after
 * hydration; /search stays a static page and its URL stays /search.
 */

export interface Shelf {
    id: string;
    title: string;
    subtitle: string;
    search: SearchParams;
    /** URL query for "See all": the same list as a normal search, paginated. */
    query: string;
}

const SPOTLIGHT_GENRES = [
    "action",
    "romance",
    "comedy",
    "fantasy",
    "mystery",
    "sci-fi",
    "slice-of-life",
    "sports",
    "psychological",
    "isekai",
    "supernatural",
    "drama",
];

// Early in January a "this year" list is nearly empty: use last year until March.
const now = new Date();
const SHELF_YEAR = now.getMonth() < 2 ? now.getFullYear() - 1 : now.getFullYear();

function genreShelf(slug: string): Shelf {
    const genre = GENRES.find((g) => g.slug === slug)!;
    return {
        id: `genre-${slug}`,
        title: `${genre.name} spotlight`,
        subtitle: `The highest-rated ${genre.name.toLowerCase()} anime`,
        search: { genreIds: [genre.id], sort: "score" },
        query: `genre=${slug}&sort=score`,
    };
}

const FIXED_SHELVES: Shelf[] = [
    {
        id: "airing",
        title: "Airing now",
        subtitle: "The most popular shows on air this season",
        search: { status: "airing", sort: "popularity" },
        query: "status=airing&sort=popularity",
    },
    {
        id: "top-rated",
        title: "Top rated",
        subtitle: "The highest-scored anime of all time",
        search: { sort: "score" },
        query: "sort=score",
    },
    {
        id: "this-year",
        title: `Popular in ${SHELF_YEAR}`,
        subtitle: `What everyone's watching from ${SHELF_YEAR}`,
        search: { year: SHELF_YEAR, sort: "popularity" },
        query: `year=${SHELF_YEAR}&sort=popularity`,
    },
    {
        id: "upcoming",
        title: "Coming soon",
        subtitle: "The most anticipated upcoming anime",
        search: { status: "upcoming", sort: "popularity" },
        query: "status=upcoming&sort=popularity",
    },
];

// "Genre spotlight" counts as one shelf in the draw, so it doesn't crowd out
// the others; the genre itself is then picked at random.
const DRAW_SIZE = FIXED_SHELVES.length + 1;

function randomShelf(exceptId?: string): Shelf {
    for (;;) {
        const i = Math.floor(Math.random() * DRAW_SIZE);
        const shelf =
            i < FIXED_SHELVES.length
                ? FIXED_SHELVES[i]
                : genreShelf(SPOTLIGHT_GENRES[Math.floor(Math.random() * SPOTLIGHT_GENRES.length)]);
        if (shelf.id !== exceptId) return shelf;
    }
}

// Tiny store: null until the page mounts, then one random shelf per visit.
let current: Shelf | null = null;
const listeners = new Set<() => void>();

function emit(next: Shelf | null) {
    current = next;
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function shuffleShelf(): void {
    emit(randomShelf(current?.id));
}

/** The shelf for this visit (null on the server and before mount). */
export function useLandingShelf(): Shelf | null {
    const shelf = useSyncExternalStore(subscribe, () => current, () => null);

    // A fresh pick on every visit to /search, including client-side
    // navigations back to it; cleared on leave so the next visit re-picks.
    useEffect(() => {
        emit(randomShelf());
        return () => {
            current = null;
        };
    }, []);

    return shelf;
}

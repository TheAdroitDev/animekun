import { unstable_cache } from "next/cache";

import { animeProvider } from "@/services/anime-provider";
import type { AnimeQuizEntry } from "@/services/anime-provider/types";

import type { PoolAnime } from "../types";

/**
 * The quiz question pool: the most popular anime, one per franchise, with
 * a cleaned synopsis that has every known title masked out.
 *
 * Server-only (never import from client code). Ground Rule 17: quizzes
 * never call Tenrai per game or per question. The pool is built from 4
 * Tenrai calls and kept in Next's data cache for a day, shared by every
 * function instance (an in-memory cache would not survive, Ground Rule 6).
 */

const POOL_PAGES = 4; // 4 × 25 = the top 100 by popularity
const MIN_POOL_SIZE = 40;
const MIN_SYNOPSIS_LENGTH = 120;
const MAX_SYNOPSIS_LENGTH = 500;
const MASK = "▢▢▢";

/**
 * Builds the pool from Tenrai. Pages are fetched one after another (not in
 * parallel) to stay under Tenrai's rate limit. A failed page is skipped;
 * if too few anime are left it throws, so nothing is cached and the next
 * request tries again.
 */
export async function buildQuizPool(): Promise<PoolAnime[]> {
    const entries: AnimeQuizEntry[] = [];

    for (let page = 1; page <= POOL_PAGES; page++) {
        try {
            entries.push(...(await animeProvider.getPopularForQuiz(page)));
        } catch (error) {
            console.error(`[quiz-pool] page ${page} failed`, error);
        }
    }

    // Entries arrive most popular first, so the first of each franchise
    // wins ("Attack on Titan" over "Attack on Titan Season 2"). Otherwise
    // two options in one question could both look right.
    const franchises = new Set<string>();
    const pool: PoolAnime[] = [];

    for (const entry of entries) {
        const franchise = franchiseKey(entry.title);
        if (isKnownFranchise(franchise, franchises)) continue;
        if (!entry.posterUrl || !entry.synopsis) continue;

        const synopsis = truncateAtSentence(
            maskTitles(cleanSynopsis(entry.synopsis), [entry.title, ...entry.allTitles]),
            MAX_SYNOPSIS_LENGTH,
        );
        if (synopsis.length < MIN_SYNOPSIS_LENGTH) continue;

        franchises.add(franchise);
        pool.push({
            id: entry.id,
            title: entry.title,
            posterUrl: entry.posterUrl,
            synopsis,
            genres: entry.genres,
            year: entry.year,
            popularity: entry.popularity,
        });
    }

    if (pool.length < MIN_POOL_SIZE) {
        throw new Error(`Quiz pool too small (${pool.length} anime)`);
    }

    return pool;
}

/** The cached pool (rebuilt at most once a day). Use this, not buildQuizPool. */
export const getQuizPool = unstable_cache(buildQuizPool, ["quiz-pool-v1"], {
    revalidate: 86400,
    tags: ["quiz-pool"],
});

// Helpers

/** Drops MAL's credit lines and squashes whitespace. */
function cleanSynopsis(text: string): string {
    return text
        .replace(/\[Written by MAL Rewrite\]/gi, "")
        .replace(/\((?:Source|Sources):[^)]*\)/gi, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Masks every title variant (full title, the part before a colon, the title
 * without "Season 2"…), longest first, as whole words only, so "Naruto"
 * becomes "▢▢▢" and "Naruto Uzumaki" becomes "▢▢▢ Uzumaki".
 */
function maskTitles(text: string, titles: string[]): string {
    const variants = new Set<string>();

    for (const title of titles) {
        const full = title.trim();
        for (const t of [full, full.replace(/^the\s+/i, "")]) {
            variants.add(t);
            variants.add(t.split(":")[0].trim());
            variants.add(stripSeason(t));
        }
    }

    const sorted = [...variants]
        .filter((v) => v.length >= 3 && /\p{L}/u.test(v))
        .sort((a, b) => b.length - a.length);

    let masked = text;
    for (const variant of sorted) {
        const wholeWord = new RegExp(
            `(?<![\\p{L}\\p{N}])${escapeRegExp(variant)}(?![\\p{L}\\p{N}])`,
            "giu",
        );
        masked = masked.replace(wholeWord, MASK);
    }
    return masked;
}

/** "Attack on Titan Season 3 Part 2" → "Attack on Titan". */
function stripSeason(title: string): string {
    return title
        .split(":")[0]
        .replace(
            /\s+(?:season\s*\d+|\d+(?:st|nd|rd|th)\s+season|(?:second|third|fourth|fifth|final)\s+season|part\s*\d+|ii|iii|iv|[2-5])\b.*$/i,
            "",
        )
        .trim();
}

/** Lower-case base title used to keep one anime per franchise. */
function franchiseKey(title: string): string {
    const normalize = (t: string) =>
        t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    const base = normalize(stripSeason(title));
    // Very short bases ("Re" from "Re:Zero") would merge unrelated shows.
    return base.length >= 4 ? base : normalize(title);
}

/**
 * Same franchise as one already in the pool: the same base title, or one
 * that extends it word by word ("naruto shippuden" after "naruto",
 * "noragami aragoto" after "noragami").
 */
function isKnownFranchise(key: string, known: Set<string>): boolean {
    for (const existing of known) {
        if (key === existing || key.startsWith(`${existing} `)) return true;
    }
    return false;
}

function truncateAtSentence(text: string, max: number): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastStop = cut.lastIndexOf(". ");
    return lastStop > max / 2 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

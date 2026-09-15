/**
 * Genre list with IDs matching Tenrai / MAL genre IDs.
 * Source: https://api.tenrai.org/v1/genres/anime
 *
 * Only curated genres relevant to AnimeKun are included here.
 * NSFW genres (Ecchi, Erotica, Hentai) are intentionally excluded.
 */
export const GENRES = [
    { id: 1, name: "Action", slug: "action" },
    { id: 2, name: "Adventure", slug: "adventure" },
    { id: 4, name: "Comedy", slug: "comedy" },
    { id: 8, name: "Drama", slug: "drama" },
    { id: 10, name: "Fantasy", slug: "fantasy" },
    { id: 14, name: "Horror", slug: "horror" },
    { id: 7, name: "Mystery", slug: "mystery" },
    { id: 22, name: "Romance", slug: "romance" },
    { id: 24, name: "Sci-Fi", slug: "sci-fi" },
    { id: 36, name: "Slice of Life", slug: "slice-of-life" },
    { id: 30, name: "Sports", slug: "sports" },
    { id: 37, name: "Supernatural", slug: "supernatural" },
    { id: 41, name: "Suspense", slug: "suspense" },
    { id: 40, name: "Psychological", slug: "psychological" },
    { id: 13, name: "Historical", slug: "historical" },
    { id: 62, name: "Isekai", slug: "isekai" },
    { id: 18, name: "Mecha", slug: "mecha" },
    { id: 19, name: "Music", slug: "music" },
    { id: 38, name: "Military", slug: "military" },
    { id: 17, name: "Martial Arts", slug: "martial-arts" },
    { id: 25, name: "Shoujo", slug: "shoujo" },
    { id: 27, name: "Shounen", slug: "shounen" },
    { id: 42, name: "Seinen", slug: "seinen" },
    { id: 23, name: "School", slug: "school" },
] as const;

/** Set of valid genre IDs for quick validation in API routes. */
export const VALID_GENRE_IDS: Set<number> = new Set(GENRES.map((g) => g.id));
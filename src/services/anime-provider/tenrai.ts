import axios, {
    AxiosError,
    type AxiosInstance,
    type InternalAxiosRequestConfig,
} from "axios";

import type { AnimeProvider } from "./provider";
import type {
    Anime,
    AnimeDetail,
    AnimeQuizEntry,
    Character,
    PaginatedResponse,
    SearchParams,
} from "./types";

import { ApiError } from "@/lib/utils/api-error";

import { MemoryCache } from "./cache";

// Supplementary data (characters, recommendations) gets a shorter timeout
// than the default 10s: if Tenrai is slow, the section is skipped rather
// than keeping its skeleton on screen.
const SECONDARY_TIMEOUT_MS = 4_000;

// Tenrai API response types

interface TenraiPagination {
    current_page: number;
    has_next_page: boolean;
    last_visible_page: number;
    items: {
        count: number;
        total: number;
        per_page: number;
    };
}

interface TenraiAnimeEntry {
    mal_id: number;
    url: string;

    images?: {
        jpg?: {
            image_url?: string;
            small_image_url?: string;
            large_image_url?: string;
        };

        webp?: {
            image_url?: string;
            small_image_url?: string;
            large_image_url?: string;
        };
    };

    trailer?: {
        url?: string | null;
        youtube_id?: string | null;
        embed_url?: string | null;
    } | null;

    approved?: boolean;

    titles?: Array<{
        type: string;
        title: string;
    }>;

    title?: string;
    title_english?: string | null;
    title_japanese?: string | null;

    type?: string | null;
    source?: string | null;

    episodes?: number | null;

    status?: string | null;

    airing?: boolean;

    aired?: {
        from?: string | null;
        to?: string | null;
    };

    duration?: string | null;

    rating?: string | null;

    score?: number | null;
    scored_by?: number | null;

    rank?: number | null;
    popularity?: number | null;
    members?: number | null;
    favorites?: number | null;

    synopsis?: string | null;

    background?: string | null;

    season?: string | null;
    year?: number | null;

    genres?: Array<{
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }>;

    explicit_genres?: Array<{
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }>;

    themes?: Array<{
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }>;

    demographics?: Array<{
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }>;

    studios?: Array<{
        mal_id: number;
        type: string;
        name: string;
        url: string;
    }>;

    relations?: Array<{
        relation: string;
        entry?: Array<{
            mal_id: number;
            type: string;
            name: string;
            url?: string;
            images?: TenraiAnimeEntry["images"];
        }>;
    }>;
}

interface TenraiAnimeResponse {
    data: TenraiAnimeEntry;
}

interface TenraiAnimeListResponse {
    pagination: TenraiPagination;
    data: TenraiAnimeEntry[];
}

interface TenraiCharacterEntry {
    character?: {
        mal_id: number;
        url: string;

        images?: {
            jpg?: {
                image_url?: string;
                small_image_url?: string;
            };

            webp?: {
                image_url?: string;
                small_image_url?: string;
            };
        };

        name: string;
    };

    role?: string;
}

interface TenraiCharactersResponse {
    data: TenraiCharacterEntry[];
}

interface TenraiRecommendationEntry {
    entry: {
        mal_id: number;
        title: string;
        images?: TenraiAnimeEntry["images"];
    };
}

interface TenraiRecommendationsResponse {
    data: TenraiRecommendationEntry[];
}

// Provider

export class TenraiProvider implements AnimeProvider {
    private readonly client: AxiosInstance;
    private readonly cache: MemoryCache;

    constructor() {
        this.client = axios.create({
            baseURL: "https://api.tenrai.org/v1",
            timeout: 10_000,
            headers: {
                Accept: "application/json",
            },
        });

        this.cache = new MemoryCache();

        // Tenrai rate limit (429): wait what it asks for (max 1s) and retry
        // ONCE. Absorbs short bursts (e.g. a crawler opening many uncached
        // anime pages). Waiting is I/O, not billed as Active CPU on Vercel.
        this.client.interceptors.response.use(undefined, async (error: AxiosError) => {
            const config = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
            if (error.response?.status !== 429 || !config || config._retried) throw error;

            config._retried = true;
            const retryAfterSec = Number(error.response.headers["retry-after"]);
            const waitMs = retryAfterSec > 0 ? Math.min(retryAfterSec * 1000, 1000) : 1000;
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            return this.client.request(config);
        });
    }

    // Search

    async search(
        params: SearchParams,
    ): Promise<PaginatedResponse<Anime>> {
        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    "/anime",
                    {
                        params: {
                            q: params.query,
                            genres: params.genreIds?.join(","),
                            year: params.year,
                            start_date: params.startDate,
                            end_date: params.endDate,
                            status: params.status,
                            order_by: params.sort === "date" ? "start_date" : params.sort,
                            sort:
                                params.sort === "popularity" || params.sort === "title"
                                    ? "asc"
                                    : params.sort
                                      ? "desc"
                                      : undefined,
                            page: params.page ?? 1,
                            limit: Math.min(params.limit ?? 25, 50),
                            sfw: true,
                        },
                    },
                );

            return {
                data: response.data.data.map(
                    (anime) => this.mapAnime(anime),
                ),

                page:
                    response.data.pagination.current_page,

                limit:
                    response.data.pagination.items.per_page,

                total:
                    response.data.pagination.items.total,

                hasNextPage:
                    response.data.pagination.has_next_page,
            };
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to search anime",
            );
        }
    }

    // Trending

    async getTrending(): Promise<Anime[]> {
        const cacheKey = "anime:trending";

        const cached =
            this.cache.get<Anime[]>(cacheKey);

        if (cached) {
            console.log("CACHE HIT:", cacheKey);
            return cached;
        }

        console.log("CACHE MISS:", cacheKey);

        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    "/top/anime",
                    {
                        params: {
                            filter: "airing",
                            limit: 10,
                            sfw: true,
                        },
                    },
                );

            const anime = response.data.data.map(
                (item) => this.mapAnime(item),
            );

            this.cache.set(
                cacheKey,
                anime,
                30 * 60 * 1000,
            );

            return anime;
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch trending anime",
            );
        }
    }

    // Popular

    async getPopular(): Promise<Anime[]> {
        const cacheKey = "anime:popular";

        const cached =
            this.cache.get<Anime[]>(cacheKey);

        if (cached) {
            console.log("CACHE HIT:", cacheKey);
            return cached;
        }

        console.log("CACHE MISS:", cacheKey);

        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    "/top/anime",
                    {
                        params: {
                            filter: "bypopularity",
                            limit: 20,
                            sfw: true,
                        },
                    },
                );

            const anime = response.data.data.map(
                (item) => this.mapAnime(item),
            );

            this.cache.set(
                cacheKey,
                anime,
                30 * 60 * 1000,
            );

            return anime;
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch popular anime",
            );
        }
    }

    // Quiz source (no MemoryCache: the quiz pool caches the whole result
    // in Next's data cache, which survives between function instances)

    async getPopularForQuiz(
        page: number,
    ): Promise<AnimeQuizEntry[]> {
        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    "/top/anime",
                    {
                        params: {
                            filter: "bypopularity",
                            page,
                            limit: 25,
                            sfw: true,
                        },
                    },
                );

            return response.data.data.map((item) => ({
                ...this.mapAnime(item),
                synopsis: item.synopsis ?? null,
                allTitles: [
                    item.title,
                    item.title_english,
                    item.title_japanese,
                    ...(item.titles?.map((t) => t.title) ?? []),
                ].filter((t): t is string => Boolean(t)),
                popularity: item.popularity ?? null,
            }));
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to fetch popular anime page ${page}`,
            );
        }
    }

    // Seasonal

    async getSeasonal(
        season: string,
        year: number,
    ): Promise<Anime[]> {
        const cacheKey =
            `anime:seasonal:${year}:${season}`;

        const cached =
            this.cache.get<Anime[]>(cacheKey);

        if (cached) {
            console.log("CACHE HIT:", cacheKey);
            return cached;
        }

        console.log("CACHE MISS:", cacheKey);

        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    `/seasons/${year}/${season}`,
                    {
                        params: {
                            limit: 25,
                            sfw: true,
                        },
                    },
                );

            const anime = response.data.data.map(
                (item) => this.mapAnime(item),
            );

            this.cache.set(
                cacheKey,
                anime,
                30 * 60 * 1000,
            );

            return anime;
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch seasonal anime",
            );
        }
    }

    // Anime detail

    async getAnimeById(
        id: string,
    ): Promise<AnimeDetail> {
        try {
            const response =
                await this.client.get<TenraiAnimeResponse>(
                    `/anime/${id}/full`,
                    {
                        params: {
                            sfw: true,
                        },
                    },
                );

            return this.mapAnimeDetail(
                response.data.data,
            );
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to fetch anime ${id}`,
            );
        }
    }

    // Characters

    async getCharacters(
        animeId: string,
    ): Promise<Character[]> {
        try {
            const response =
                await this.client.get<TenraiCharactersResponse>(
                    `/anime/${animeId}/characters`,
                    { timeout: SECONDARY_TIMEOUT_MS },
                );

            return response.data.data
                .filter(
                    (entry) => entry.character,
                )
                .map((entry) => ({
                    id: String(
                        entry.character!.mal_id,
                    ),

                    name: entry.character!.name,

                    imageUrl:
                        entry.character!.images?.webp
                            ?.image_url ??
                        entry.character!.images?.jpg
                            ?.image_url ??
                        null,

                    role: entry.role ?? null,
                }));
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to fetch characters for anime ${animeId}`,
            );
        }
    }

    // Recommendations

    async getRecommendations(
        animeId: string,
    ): Promise<Anime[]> {
        try {
            const response =
                await this.client.get<TenraiRecommendationsResponse>(
                    `/anime/${animeId}/recommendations`,
                    { timeout: SECONDARY_TIMEOUT_MS },
                );

            return response.data.data
                .slice(0, 12)
                .map((rec) => ({
                    id: String(rec.entry.mal_id),
                    title: rec.entry.title,
                    posterUrl:
                        rec.entry.images?.webp
                            ?.large_image_url ??
                        rec.entry.images?.jpg
                            ?.large_image_url ??
                        null,
                    score: null,
                    genres: [],
                    status: null,
                    year: null,
                }));
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to fetch recommendations for anime ${animeId}`,
            );
        }
    }

    // Find by title (AI Generate, step 8.7)
    // One search; a result counts only if one of its titles (default,
    // English, synonyms…) equals the wanted title once normalised. A wrong
    // link is worse than no link. Hits and misses are cached for a day
    // (per instance, a speed-up only); errors are not cached.

    async findByTitle(
        title: string,
    ): Promise<Anime | null> {
        const wanted = normalizeTitle(title);
        const cacheKey = `anime:title:${wanted}`;

        const cached = this.cache.get<{ anime: Anime | null }>(cacheKey);
        if (cached) return cached.anime;

        try {
            const response =
                await this.client.get<TenraiAnimeListResponse>(
                    "/anime",
                    {
                        // Tenrai's own relevance order. Ordering by
                        // popularity let popular partial matches ("Pocket
                        // Monsters"…) crowd out "Monster". No sfw=true: it
                        // also hides R+ titles like Monster (2004); only Rx
                        // (hentai) is excluded, below.
                        params: { q: title, limit: 10 },
                        timeout: SECONDARY_TIMEOUT_MS,
                    },
                );

            // Several anime can share a title ("Monster" 2004 vs a 2019
            // short): the AI means the well-known one, so the most popular
            // exact match wins (MAL popularity rank: lower = more popular).
            const match = response.data.data
                .filter((entry) => !entry.rating?.startsWith("Rx"))
                .filter((entry) =>
                    [
                        entry.title,
                        entry.title_english,
                        ...(entry.titles?.map((t) => t.title) ?? []),
                    ].some((t) => t != null && normalizeTitle(t) === wanted),
                )
                .sort((a, b) => (a.popularity || Infinity) - (b.popularity || Infinity))[0];

            const anime = match ? this.mapAnime(match) : null;
            this.cache.set(cacheKey, { anime }, 24 * 60 * 60 * 1000);
            return anime;
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to find anime by title "${title}"`,
            );
        }
    }

    // Mapping

    private mapAnime(
        anime: TenraiAnimeEntry,
    ): Anime {
        return {
            id: String(anime.mal_id),

            title:
                anime.title_english ??
                anime.title ??
                anime.title_japanese ??
                "Unknown title",

            posterUrl:
                anime.images?.webp
                    ?.large_image_url ??
                anime.images?.jpg
                    ?.large_image_url ??
                anime.images?.webp?.image_url ??
                anime.images?.jpg?.image_url ??
                null,

            score: anime.score ?? null,

            genres:
                anime.genres?.map(
                    (genre) => genre.name,
                ) ?? [],

            status: anime.status ?? null,

            year: anime.year ?? null,
        };
    }

    private mapAnimeDetail(
        anime: TenraiAnimeEntry,
    ): AnimeDetail {
        return {
            ...this.mapAnime(anime),

            synopsis: anime.synopsis ?? null,

            type: anime.type ?? null,

            source: anime.source ?? null,

            duration: anime.duration ?? null,

            rating: anime.rating ?? null,

            popularity:
                anime.popularity ?? null,

            episodes:
                anime.episodes ?? null,

            studios:
                anime.studios?.map(
                    (studio) => studio.name,
                ) ?? [],

            airingFrom:
                anime.aired?.from ?? null,

            airingTo:
                anime.aired?.to ?? null,

            relations: anime.relations
                ? anime.relations
                    .flatMap((r) =>
                        (r.entry ?? [])
                            .filter((e) => e.type === "anime")
                            .map((e) => ({
                                id: String(e.mal_id),
                                title: e.name,
                                posterUrl:
                                    e.images?.webp?.large_image_url ??
                                    e.images?.jpg?.large_image_url ??
                                    e.images?.webp?.image_url ??
                                    e.images?.jpg?.image_url ??
                                    null,
                                score: null,
                                genres: r.relation ? [r.relation] : [],
                                status: null,
                                year: null,
                            }))
                    )
                : [],
        };
    }

    // Error handling

    private normalizeError(
        error: unknown,
        fallbackMessage: string,
    ): Error {
        if (axios.isAxiosError(error)) {
            const axiosError =
                error as AxiosError<{
                    status?: number;
                    type?: string;
                    message?: string;
                    error?: string;
                    path?: string;
                }>;

            if (
                axiosError.code ===
                "ECONNABORTED"
            ) {
                return new ApiError(
                    504,
                    "Tenrai request timed out",
                );
            }

            if (axiosError.response) {
                const body =
                    axiosError.response.data;

                // Keep the upstream status so callers can tell a real 404
                // apart from an outage (e.g. notFound() vs error page).
                return new ApiError(
                    axiosError.response.status,
                    body?.message ??
                    body?.error ??
                    `${fallbackMessage} (${axiosError.response.status})`,
                );
            }

            if (axiosError.request) {
                return new ApiError(
                    502,
                    "Tenrai API is unreachable",
                );
            }
        }

        if (error instanceof Error) {
            return error;
        }

        return new Error(fallbackMessage);
    }
}
// "Steins;Gate" and "steins gate", "Shinsekai Yori" and "Shinsekai yori"
// compare equal: lower case, no accents, punctuation as spaces.
function normalizeTitle(title: string): string {
    return title
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

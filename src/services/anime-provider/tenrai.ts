import axios, {
    AxiosError,
    type AxiosInstance,
} from "axios";

import type { AnimeProvider } from "./provider";
import type {
    Anime,
    AnimeDetail,
    Character,
    PaginatedResponse,
    SearchParams,
} from "./types";

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

export class TenraiProvider implements AnimeProvider {
    private readonly client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: "https://api.tenrai.org/v1",
            timeout: 10_000,
            headers: {
                Accept: "application/json",
            },
        });
    }

    async search(params: SearchParams,): Promise<PaginatedResponse<Anime>> {
        try {
            const response = await this.client.get<TenraiAnimeListResponse>("/anime",
                {
                    params: {
                        q: params.query,
                        genres: params.genreIds?.join(","),
                        year: params.year,
                        status: params.status,
                        page: params.page ?? 1,
                        limit: Math.min(params.limit ?? 25, 50),
                        sfw: true,
                    },
                },
            );

            return {
                data: response.data.data.map((anime) => this.mapAnime(anime)),
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

    async getTrending(): Promise<Anime[]> {
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

            return response.data.data.map((anime) =>
                this.mapAnime(anime),
            );
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch trending anime",
            );
        }
    }

    async getPopular(): Promise<Anime[]> {
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

            return response.data.data.map((anime) =>
                this.mapAnime(anime),
            );
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch popular anime",
            );
        }
    }

    async getSeasonal(
        season: string,
        year: number,
    ): Promise<Anime[]> {
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

            return response.data.data.map((anime) =>
                this.mapAnime(anime),
            );
        } catch (error) {
            throw this.normalizeError(
                error,
                "Failed to fetch seasonal anime",
            );
        }
    }

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

return this.mapAnimeDetail(response.data.data);
        } catch (error) {
            throw this.normalizeError(
                error,
                `Failed to fetch anime ${id}`,
            );
        }
    }

    async getCharacters(
        animeId: string,
    ): Promise<Character[]> {
        try {
            const response =
                await this.client.get<TenraiCharactersResponse>(
                    `/anime/${animeId}/characters`,
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
                anime.images?.webp?.large_image_url ??
                anime.images?.jpg?.large_image_url ??
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
        };
    }

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

            if (axiosError.code === "ECONNABORTED") {
                return new Error(
                    "Tenrai request timed out",
                );
            }

            if (axiosError.response) {
                const body =
                    axiosError.response.data;

                return new Error(
                    body?.message ??
                    body?.error ??
                    `${fallbackMessage} (${axiosError.response.status})`,
                );
            }

            if (axiosError.request) {
                return new Error(
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
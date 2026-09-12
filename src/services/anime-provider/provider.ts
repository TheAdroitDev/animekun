import type {
    Anime, AnimeDetail, Character, PaginatedResponse, SearchParams,
} from "./types";

// heart of the architecture 
export interface AnimeProvider {
    search(params: SearchParams,): Promise<PaginatedResponse<Anime>>;

    getTrending(): Promise<Anime[]>;

    getPopular(): Promise<Anime[]>;

    getSeasonal(
        season: string,
        year: number,
    ): Promise<Anime[]>;

    getAnimeById(
        id: string,
    ): Promise<AnimeDetail>;

    getCharacters(
        animeId: string,
    ): Promise<Character[]>;
}
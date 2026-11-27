import type {
    Anime, AnimeDetail, AnimeQuizEntry, Character, PaginatedResponse, SearchParams,
} from "./types";

// heart of the architecture 
export interface AnimeProvider {
    search(params: SearchParams,): Promise<PaginatedResponse<Anime>>;

    getTrending(): Promise<Anime[]>;

    getPopular(): Promise<Anime[]>;

    // One page (25) of the most popular anime, with synopsis and all
    // titles. Quiz source material; cached by the caller, not here.
    getPopularForQuiz(
        page: number,
    ): Promise<AnimeQuizEntry[]>;

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

    getRecommendations(
        animeId: string,
    ): Promise<Anime[]>;

    // The anime whose title matches exactly (case/punctuation ignored), or
    // null. Used to link AI recommendations, which come back as titles.
    findByTitle(
        title: string,
    ): Promise<Anime | null>;
}
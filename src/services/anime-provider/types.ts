export interface Anime {
  id: string;
  title: string;
  posterUrl: string | null;
  score: number | null;
  genres: string[];
  status: string | null;
  year: number | null;
}

export interface AnimeDetail extends Anime {
  synopsis: string | null;
  type: string | null;
  source: string | null;
  duration: string | null;
  rating: string | null;
  popularity: number | null;
  episodes: number | null;
  studios: string[];
  airingFrom: string | null;
  airingTo: string | null;
}

export interface Character {
  id: string;
  name: string;
  imageUrl: string | null;
  role: string | null;
}

export interface SearchParams {
  query?: string;
  genre?: string;
  year?: number;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
}
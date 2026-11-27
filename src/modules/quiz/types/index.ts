import type { DIFFICULTIES, QUIZ_MODES } from "../constants";

export type QuizMode = (typeof QUIZ_MODES)[number];

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * One anime in the cached question pool (server-only data). `synopsis` is
 * already cleaned and has every known title masked out.
 */
export interface PoolAnime {
    id: string;
    title: string;
    posterUrl: string;
    synopsis: string;
    genres: string[];
    year: number | null;
    /** MAL popularity rank (1 = most popular). */
    popularity: number | null;
}

/** An answer option as the browser sees it. */
export interface QuizOption {
    id: string;
    title: string;
}

/**
 * A question as sent to the browser. Never contains the correct answer:
 * the server keeps that and checks each answer (Phase 9 notes).
 */
export interface QuizQuestion {
    index: number;
    mode: QuizMode;
    /** Masked synopsis (synopsis mode) or poster URL (poster mode). */
    prompt: string;
    options: QuizOption[];
    timeLimitSeconds: number;
}

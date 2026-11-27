import type { DIFFICULTIES, LIFELINES, QUIZ_MODES } from "../constants";

export type QuizMode = (typeof QUIZ_MODES)[number];

export type Difficulty = (typeof DIFFICULTIES)[number];

export type Lifeline = (typeof LIFELINES)[number];

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
 * A question as stored in quiz_sessions.questions (server-only: it holds
 * the answer, `animeId`).
 */
export interface StoredQuestion {
    animeId: string;
    prompt: string;
    options: QuizOption[];
    /** Hint lifeline text, e.g. "Action · Fantasy · aired 2011". */
    hint: string;
    /** The 2 wrong options the 50/50 lifeline removes. */
    removeIds: string[];
}

/** One answered question in quiz_sessions.answers (null = timed out or skipped). */
export interface StoredAnswer {
    optionId: string | null;
    correct: boolean;
    ms: number;
    /** Skip lifeline: no points, streak kept. */
    skipped: boolean;
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

/** POST /api/quiz/start → the game id and its first question. */
export interface StartQuizResult {
    sessionId: string;
    total: number;
    question: QuizQuestion;
}

/** The final numbers, sent with the last answer. */
export interface QuizResults {
    score: number;
    correctCount: number;
    total: number;
    bestStreak: number;
    durationMs: number;
}

/**
 * POST /api/quiz/answer → whether it was right, the right option (for the
 * reveal), and the next question, or the results after the last one.
 */
export interface AnswerResult {
    correct: boolean;
    timedOut: boolean;
    skipped: boolean;
    correctId: string;
    score: number;
    streak: number;
    next: QuizQuestion | null;
    results: QuizResults | null;
}

/** POST /api/quiz/lifeline → what that lifeline reveals for the current question. */
export type LifelineResult =
    | { type: "fifty"; removedIds: string[] }
    | { type: "hint"; hint: string };

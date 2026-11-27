/**
 * Quiz settings shared by the server (question pool, answer checks) and the
 * UI. v1 modes: name the anime from its synopsis (titles masked) or from
 * its poster. "Guess Opening" was dropped: MAL has no audio and openings
 * are copyrighted. Characters can come later (one Tenrai call per anime).
 */
export const QUIZ_MODES = ["synopsis", "poster"] as const;

// Nightmare dropped for v1: 5s is too short to read a synopsis. 
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

// Seconds per question. The server rejects answers after this (plus slack). */
export const TIME_LIMIT_SECONDS = {
    easy: 30,
    medium: 20,
    hard: 10,
} as const satisfies Record<(typeof DIFFICULTIES)[number], number>;

export const QUESTIONS_PER_GAME = 10;

// Answer options per question (1 correct + 3 distractors).
export const OPTIONS_PER_QUESTION = 4;

// Points for a correct answer (harder = more).
export const POINTS_PER_CORRECT = {
    easy: 100,
    medium: 150,
    hard: 200,
} as const satisfies Record<(typeof DIFFICULTIES)[number], number>;

// Extra seconds the server allows for network delay before an answer
// counts as too late.
export const ANSWER_SLACK_SECONDS = 2;

// After an answer, the right option is shown this long before the next
// question appears. The server starts the next question's clock this much
// later, so reading the answer never costs time ("Next" skips it early).
export const REVEAL_SECONDS = 2;

// Replaces titles in synopses (server) and is drawn as a "hidden" pill (UI).
export const TITLE_MASK = "▢▢▢";

// Games a user can start per UTC day (ai_usage counter, like AI Finder).
// The global cap only guards against abuse; normal use never reaches it.
export const QUIZ_ENDPOINT = "quiz";
export const QUIZ_DAILY_LIMITS = {
    perUser: 20,
    global: 2000,
} as const;

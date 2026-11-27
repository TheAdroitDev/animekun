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

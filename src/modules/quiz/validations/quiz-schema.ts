import { z } from "zod";

import { DIFFICULTIES, QUESTIONS_PER_GAME, QUIZ_MODES } from "../constants";

// POST /api/quiz/start
export const startQuizSchema = z.object({
    mode: z.enum(QUIZ_MODES),
    difficulty: z.enum(DIFFICULTIES),
});

// POST /api/quiz/answer. optionId null = the timer ran out.
export const answerQuizSchema = z.object({
    sessionId: z.uuid(),
    index: z.number().int().min(0).max(QUESTIONS_PER_GAME - 1),
    optionId: z.string().regex(/^[1-9]\d{0,9}$/).nullable(),
});

export type StartQuizInput = z.infer<typeof startQuizSchema>;
export type AnswerQuizInput = z.infer<typeof answerQuizSchema>;

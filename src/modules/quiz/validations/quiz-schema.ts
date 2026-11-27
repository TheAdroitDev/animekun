import { z } from "zod";

import { DIFFICULTIES, QUESTIONS_PER_GAME, QUIZ_MODES } from "../constants";

// POST /api/quiz/start
export const startQuizSchema = z.object({
    mode: z.enum(QUIZ_MODES),
    difficulty: z.enum(DIFFICULTIES),
});

const sessionId = z.uuid();
const questionIndex = z.number().int().min(0).max(QUESTIONS_PER_GAME - 1);

// POST /api/quiz/answer. optionId null = the timer ran out, or a skip
// (skip lifeline, 9.7: then optionId must be null).
export const answerQuizSchema = z
    .object({
        sessionId,
        index: questionIndex,
        optionId: z.string().regex(/^[1-9]\d{0,9}$/).nullable(),
        skip: z.boolean().optional().default(false),
    })
    .refine((data) => !data.skip || data.optionId === null, {
        message: "A skip has no answer",
    });

// POST /api/quiz/lifeline (Skip goes through /answer)
export const lifelineSchema = z.object({
    sessionId,
    index: questionIndex,
    type: z.enum(["fifty", "hint"]),
});

export type StartQuizInput = z.infer<typeof startQuizSchema>;
export type AnswerQuizInput = z.infer<typeof answerQuizSchema>;
export type LifelineInput = z.infer<typeof lifelineSchema>;

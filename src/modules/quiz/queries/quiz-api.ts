"use client";

import type { ApiResponseType } from "@/types/api";

import type { AnswerResult, Difficulty, QuizMode, StartQuizResult } from "../types";

/** A failed quiz request, with the server's message and HTTP status (0 = offline). */
export class QuizApiError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "QuizApiError";
        this.status = status;
    }
}

// Starting can build the question pool on a cold cache (a few seconds).
const CLIENT_TIMEOUT_MS = 35_000;

async function postJson<T>(url: string, body: unknown): Promise<T> {
    let res: Response;
    try {
        res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
        });
    } catch {
        throw new QuizApiError(0, "Couldn't reach AnimeKun. Check your connection and try again.");
    }

    const json = (await res.json().catch(() => null)) as ApiResponseType<T> | null;
    if (!res.ok || !json?.success) {
        const message = json && !json.success ? json.error : "Something went wrong. Please try again.";
        throw new QuizApiError(res.status, message);
    }
    return json.data;
}

/**
 * POST /api/quiz/answer. optionId null = time ran out. Safe to resend: the
 * server only accepts the first answer to each question (409 after that).
 */
export function answerQuizRequest(sessionId: string, index: number, optionId: string | null) {
    return postJson<AnswerResult>("/api/quiz/answer", { sessionId, index, optionId });
}

/** POST /api/quiz/start: creates a game and returns its first question. */
export function startQuizRequest(mode: QuizMode, difficulty: Difficulty) {
    return postJson<StartQuizResult>("/api/quiz/start", { mode, difficulty });
}

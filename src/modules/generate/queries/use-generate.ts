"use client";

import { useMutation } from "@tanstack/react-query";

import type { ApiResponseType } from "@/types/api";

import type { Recommendation } from "../types";

export interface GenerateResult {
    recommendations: Recommendation[];
    remaining: number;
}

/** A failed request, with the server's message and the user's tries left (if known). */
export class GenerateError extends Error {
    readonly status: number;
    readonly remaining: number | null;

    constructor(status: number, message: string, remaining: number | null) {
        super(message);
        this.name = "GenerateError";
        this.status = status;
        this.remaining = remaining;
    }
}

// The route can take up to ~26s (one Gemini retry). Plain fetch instead of
// the shared axios client: that one times out at 10s and drops the
// X-RateLimit-Remaining header on errors.
const CLIENT_TIMEOUT_MS = 35_000;

async function postGenerate(prompt: string): Promise<GenerateResult> {
    let res: Response;
    try {
        res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
            signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
        });
    } catch {
        throw new GenerateError(0, "Couldn't reach AnimeKun. Check your connection and try again.", null);
    }

    const header = res.headers.get("X-RateLimit-Remaining");
    const remaining = header === null ? null : Number(header);

    const body = (await res.json().catch(() => null)) as ApiResponseType<GenerateResult> | null;
    if (!res.ok || !body?.success) {
        const message = body && !body.success ? body.error : "Something went wrong. Please try again.";
        throw new GenerateError(res.status, message, remaining);
    }
    return body.data;
}

/** One AI request. The button is disabled while it runs, so calls never overlap. */
export function useGenerate() {
    return useMutation({ mutationFn: postGenerate });
}

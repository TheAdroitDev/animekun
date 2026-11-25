import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";

import { getEnv } from "@/lib/config/env";

import type { Recommendation } from "../types";
import {
    MAX_RECOMMENDATIONS,
    REASON_MAX_LENGTH,
    recommendationsParseSchema,
    recommendationsResponseSchema,
} from "../validations/generate-schema";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt-templates";

/**
 * Gemini recommendation service (server only: it reads AI_API_KEY).
 * Never import it through the module barrel; the API route imports it directly.
 *
 * One request = one generateContent call that must return JSON matching
 * recommendationsResponseSchema. No streaming (the UI reveals the cards with
 * an animation) and no automatic retries (the SDK only retries when asked).
 */

// Change the model here only. Free tier: check its quota in AI Studio.
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

// ~5 short recommendations need ~400 tokens; the cap keeps answers short.
const MAX_OUTPUT_TOKENS = 1024;
// Well under the route's maxDuration (step 8.2).
const REQUEST_TIMEOUT_MS = 15_000;

// Built once at module load: the schema never changes.
const RESPONSE_JSON_SCHEMA = z.toJSONSchema(recommendationsResponseSchema);

/** Gemini is rate-limited (429): show "AI is busy, try later". */
export class AiBusyError extends Error {
    constructor() {
        super("The AI is busy right now. Please try again later.");
        this.name = "AiBusyError";
    }
}

/** Anything else: missing key, timeout, upstream error, or an unusable answer. */
export class AiUnavailableError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
        this.name = "AiUnavailableError";
    }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
    const apiKey = getEnv().AI_API_KEY;
    if (!apiKey) throw new AiUnavailableError("AI_API_KEY is not set");

    client ??= new GoogleGenAI({ apiKey });
    return client;
}

export async function generateRecommendations(prompt: string): Promise<Recommendation[]> {
    let text: string | undefined;

    try {
        const response = await getClient().models.generateContent({
            model: GEMINI_MODEL,
            contents: buildUserPrompt(prompt),
            config: {
                systemInstruction: SYSTEM_PROMPT,
                responseMimeType: "application/json",
                responseJsonSchema: RESPONSE_JSON_SCHEMA,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                // A list of titles needs little reasoning; less thinking = faster, fewer tokens.
                thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                httpOptions: { timeout: REQUEST_TIMEOUT_MS },
            },
        });
        text = response.text;
    } catch (error) {
        if (error instanceof ApiError && error.status === 429) throw new AiBusyError();
        throw new AiUnavailableError("Gemini request failed", { cause: error });
    }

    if (!text) throw new AiUnavailableError("Gemini returned an empty answer");

    let json: unknown;
    try {
        json = JSON.parse(text);
    } catch (error) {
        // Usually a cut-off answer (max tokens reached).
        throw new AiUnavailableError("Gemini returned invalid JSON", { cause: error });
    }

    const parsed = recommendationsParseSchema.safeParse(json);
    if (!parsed.success) {
        throw new AiUnavailableError("Gemini's answer did not match the schema", { cause: parsed.error });
    }

    // Trim instead of failing: the user already spent a try on this request.
    return parsed.data.recommendations.slice(0, MAX_RECOMMENDATIONS).map((item) => ({
        title: item.title.slice(0, 200),
        reason: item.reason.slice(0, REASON_MAX_LENGTH),
        confidence: Math.min(Math.max(item.confidence, 0), 1),
    }));
}

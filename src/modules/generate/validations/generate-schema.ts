import { z } from "zod";

export const PROMPT_MIN_LENGTH = 3;
export const PROMPT_MAX_LENGTH = 500;
export const MAX_RECOMMENDATIONS = 5;
export const REASON_MAX_LENGTH = 200;

// What the user sends (validated in the API route, step 8.2).
export const generateInputSchema = z.object({
    prompt: z.string().trim().min(PROMPT_MIN_LENGTH).max(PROMPT_MAX_LENGTH),
});

export type GenerateInput = z.infer<typeof generateInputSchema>;

// The answer shape Gemini must follow. Sent to the model as JSON Schema
// (responseJsonSchema), so the limits here are instructions to the model.
export const recommendationsResponseSchema = z.object({
    recommendations: z
        .array(
            z.object({
                title: z
                    .string()
                    .min(1)
                    .max(200)
                    .describe("The anime's title exactly as it appears on MyAnimeList"),
                reason: z
                    .string()
                    .min(1)
                    .max(REASON_MAX_LENGTH)
                    .describe("One or two sentences on why it matches the request"),
                confidence: z
                    .number()
                    .min(0)
                    .max(1)
                    .describe("How well it matches the request, from 0 to 1"),
            }),
        )
        .max(MAX_RECOMMENDATIONS),
});

// What we accept back. Looser than the schema above: a reason a bit too long
// or a 6th item is trimmed in the service instead of failing the request
// (a failed request still costs the user one of their daily tries).
export const recommendationsParseSchema = z.object({
    recommendations: z.array(
        z.object({
            title: z.string().trim().min(1),
            reason: z.string().trim(),
            confidence: z.number(),
        }),
    ),
});

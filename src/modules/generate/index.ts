// Client-safe exports only. The AI service (services/ai-service.ts) reads
// AI_API_KEY and is server-only: import it directly from server code.
export type { Recommendation } from "./types";
export type { GenerateInput } from "./validations/generate-schema";
export {
    generateInputSchema,
    MAX_RECOMMENDATIONS,
    PROMPT_MAX_LENGTH,
    PROMPT_MIN_LENGTH,
} from "./validations/generate-schema";

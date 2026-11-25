import { LIMITS } from "@/lib/constants/limits";

// One name for the ai_usage counters, shared by the API route and the page.
export const GENERATE_ENDPOINT = "generate";

export const GENERATE_DAILY_LIMITS = {
    perUser: LIMITS.FREE.AI_REQUESTS_PER_DAY,
    global: LIMITS.GLOBAL.AI_REQUESTS_PER_DAY,
} as const;

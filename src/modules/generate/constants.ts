import { LIMITS } from "@/lib/constants/limits";

// One name for the ai_usage counters, shared by the API route and the page.
export const GENERATE_ENDPOINT = "generate";

export const GENERATE_DAILY_LIMITS = {
    perUser: LIMITS.FREE.AI_REQUESTS_PER_DAY,
    global: LIMITS.GLOBAL.AI_REQUESTS_PER_DAY,
} as const;

// Ready-made prompts: the home Generate section's vibe pills and the chips
// on /generate (step 8.8). Client-safe; one list so both stay in sync.
export const VIBE_PROMPTS = [
    { label: "Overpowered MC", prompt: "Overpowered main character who hides their power" },
    { label: "Mind Games & Suspense", prompt: "Psychological mind games with high stakes and twists" },
    { label: "Dark Fantasy", prompt: "Dark gritty fantasy with brutal consequences" },
    { label: "Comfort & Chill", prompt: "Relaxing slice of life comfort anime to unwind" },
    { label: "Tearjerker Romance", prompt: "Heartbreaking emotional romance with deep connection" },
    { label: "High-Octane Action", prompt: "Fast-paced sakuga action with great fight choreography" },
] as const;

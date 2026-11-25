export const LIMITS = {
    FREE: {
        AI_REQUESTS_PER_DAY: 5,
        BOOKMARKS_PER_USER: 2000,
    },

    // Whole app, all users together. Keep it below the Gemini free-tier
    // requests-per-day quota (check AI Studio), so users see our "busy
    // today" message instead of Gemini 429s.
    GLOBAL: {
        AI_REQUESTS_PER_DAY: 200,
    },
} as const

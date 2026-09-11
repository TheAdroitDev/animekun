export const LIMITS = {
    FREE: {
        AI_REQUESTS_PER_DAY: 5,
        BOOKMARK_BOARDS: 3
    },

    PREMIUM: {
        AI_REQUESTS_PER_DAY: Infinity,
        BOOKMARK_BOARDS: Infinity,
    },
} as const
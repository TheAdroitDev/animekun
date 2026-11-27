/** Shared by the feedback card (client) and POST /api/feedback (server). */

export const FEEDBACK_RATINGS = ["meh", "okay", "sugoi"] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

/** "What should we build next?" Stored in feedback.feature_vote. */
export const FEEDBACK_NEXT_OPTIONS = [
    { id: "town_hall", label: "Town Hall community" },
    { id: "quiz", label: "Anime quizzes" },
    { id: "search", label: "Smarter search" },
] as const;
export type FeedbackNext = (typeof FEEDBACK_NEXT_OPTIONS)[number]["id"];
export const FEEDBACK_NEXT_IDS = FEEDBACK_NEXT_OPTIONS.map((o) => o.id) as [FeedbackNext, ...FeedbackNext[]];

export const FEEDBACK_PAGE_MAX = 200;

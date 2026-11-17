import { z } from "zod";

import { BOOKMARK_STATUSES } from "../types";

// MAL anime ids are numeric; stored as text in the DB.
const animeIdSchema = z.string().trim().regex(/^\d{1,10}$/, "Invalid anime id");

// Posters only from the two image hosts next.config.ts already allows.
const posterUrlSchema = z
    .url({
        protocol: /^https$/,
        hostname: /^(cdn\.myanimelist\.net|ik\.imagekit\.io)$/,
        error: "Poster must be a MyAnimeList or ImageKit https URL",
    })
    .max(500)
    .nullable();

// Add a bookmark or move it to another column (one upsert on the server).
// Title and poster come from the anime page the user is on.
export const setBookmarkStatusSchema = z.object({
    animeId: animeIdSchema,
    status: z.enum(BOOKMARK_STATUSES),
    title: z.string().trim().min(1).max(200),
    posterUrl: posterUrlSchema,
});

export const removeBookmarkSchema = z.object({
    animeId: animeIdSchema,
});

export type SetBookmarkStatusInput = z.infer<typeof setBookmarkStatusSchema>;
export type RemoveBookmarkInput = z.infer<typeof removeBookmarkSchema>;

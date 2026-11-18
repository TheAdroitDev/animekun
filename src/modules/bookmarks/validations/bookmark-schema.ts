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

// Board drag and drop: a card's column and its place in it (one UPDATE).
const positionSchema = z.number().int().min(-2_000_000_000).max(2_000_000_000);

export const moveBookmarkSchema = z.object({
    animeId: animeIdSchema,
    status: z.enum(BOOKMARK_STATUSES),
    position: positionSchema,
});

// Rare: a column ran out of room between two cards, so it's renumbered
// from this order (one UPDATE … FROM unnest). Capped like the bookmark limit.
export const reorderColumnSchema = z.object({
    status: z.enum(BOOKMARK_STATUSES),
    animeIds: z.array(animeIdSchema).min(1).max(2000),
});

export type SetBookmarkStatusInput = z.infer<typeof setBookmarkStatusSchema>;
export type RemoveBookmarkInput = z.infer<typeof removeBookmarkSchema>;
export type MoveBookmarkInput = z.infer<typeof moveBookmarkSchema>;
export type ReorderColumnInput = z.infer<typeof reorderColumnSchema>;

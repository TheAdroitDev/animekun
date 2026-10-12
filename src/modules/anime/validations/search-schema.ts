import { z } from "zod";
import { VALID_GENRE_IDS, GENRE_SLUG_TO_ID } from "@/lib/constants/genres";
import { STATUS_VALUES, SORT_VALUES } from "@/lib/constants/search-filters";

// Valid status filters matching the AnimeProvider and Tenrai API contract.
export const searchStatusSchema = z.enum(STATUS_VALUES);

// Valid sort options accepted from UI / API (Score, Popularity, Latest Date, Alphabetical Title)
export const searchSortSchema = z.enum(SORT_VALUES);

// Validates a real calendar date in YYYY-MM-DD format (accounting for real days per month, leap years, etc.)
export const dateStringSchema = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((val) => {
        const [year, month, day] = val.split("-").map(Number);
        if (year < 1900 || year > 2100) return false;
        const d = new Date(Date.UTC(year, month - 1, day));
        return (
            d.getUTCFullYear() === year &&
            d.getUTCMonth() === month - 1 &&
            d.getUTCDate() === day
        );
    }, "Invalid calendar date");

// Validates and transforms a raw "genre" query parameter string (e.g. "action,romance" or "1,22")
// into an array of validated numeric genre IDs.
export const genreParamSchema = z
    .string()
    .optional()
    .transform((val, ctx) => {
        if (!val || !val.trim()) return undefined;
        const tokens = val
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);

        const ids: number[] = [];
        const invalid: string[] = [];

        for (const token of tokens) {
            const mappedId = GENRE_SLUG_TO_ID[token] ?? Number(token);
            if (isNaN(mappedId) || !VALID_GENRE_IDS.has(mappedId)) {
                invalid.push(token);
            } else {
                ids.push(mappedId);
            }
        }

        if (invalid.length > 0) {
            ctx.addIssue({
                code: "custom",
                message: `Invalid genre ID(s) or slug(s): ${invalid.join(", ")}`,
            });
            return z.NEVER;
        }

        return ids.length > 0 ? ids : undefined;
    });

// Zod schema for URL search query parameters (used by API routes and server components).
// Coerces and validates raw string values from URLSearchParams.
export const searchQuerySchema = z
    .object({
        q: z
            .string()
            .trim()
            .max(100, "Search query must be 100 characters or less")
            .optional()
            .transform((v) => (v ? v : undefined)),
        genre: genreParamSchema,
        year: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            z.coerce
                .number()
                .int()
                .min(1900, "Year must be 1900 or later")
                .max(2100, "Year cannot exceed 2100")
                .optional(),
        ),
        startDate: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            dateStringSchema.optional(),
        ),
        endDate: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            dateStringSchema.optional(),
        ),
        status: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            searchStatusSchema.optional(),
        ),
        sort: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            searchSortSchema.optional(),
        ),
        page: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            z.coerce.number().int().min(1, "Page must be at least 1").default(1),
        ),
        limit: z.preprocess(
            (v) => (v === "" || v === null || v === undefined ? undefined : v),
            z.coerce.number().int().min(1).max(50, "Limit cannot exceed 50").default(25),
        ),
    })
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return data.startDate <= data.endDate;
            }
            return true;
        },
        {
            message: "Start date cannot be after end date",
            path: ["startDate"],
        },
    )
    .refine(
        (data) => {
            if (data.year && (data.startDate || data.endDate)) {
                return false;
            }
            return true;
        },
        {
            message: "Cannot specify both year and date range (startDate/endDate)",
            path: ["year"],
        },
    );

// Zod schema for typed client SearchParams object before executing API requests.
export const searchParamsSchema = z
    .object({
        query: z.string().trim().max(100).optional(),
        genreIds: z
            .array(
                z.number().int().refine((id) => VALID_GENRE_IDS.has(id), {
                    message: "Invalid genre ID",
                }),
            )
            .optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        startDate: dateStringSchema.optional(),
        endDate: dateStringSchema.optional(),
        status: searchStatusSchema.optional(),
        sort: searchSortSchema.optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
    })
    .refine(
        (data) => {
            if (data.startDate && data.endDate) {
                return data.startDate <= data.endDate;
            }
            return true;
        },
        {
            message: "Start date cannot be after end date",
            path: ["startDate"],
        },
    )
    .refine(
        (data) => {
            if (data.year && (data.startDate || data.endDate)) {
                return false;
            }
            return true;
        },
        {
            message: "Cannot specify both year and date range (startDate/endDate)",
            path: ["year"],
        },
    );

export type SearchQueryInput = z.input<typeof searchQuerySchema>;
export type SearchQueryOutput = z.output<typeof searchQuerySchema>;
export type ValidatedSearchParams = z.infer<typeof searchParamsSchema>;

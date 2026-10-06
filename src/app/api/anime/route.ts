import { type NextRequest } from "next/server";

import { ApiResponse } from "@/lib/utils/api-response";
import { searchQuerySchema } from "@/modules/anime/validations/search-schema";
import { animeProvider } from "@/services/anime-provider";

/**
 * GET /api/anime
 *
 * Query params:
 *   type     — "trending" | "popular" | "seasonal" (default: search)
 *   q        — search query string
 *   genre    — comma-separated genre IDs (e.g. "1,2,8")
 *   year     — filter by year (e.g. 2024)
 *   status   — "airing" | "complete" | "upcoming"
 *   season   — required when type=seasonal (e.g. "winter")
 *   page     — pagination page (default: 1)
 *   limit    — results per page (default: 25, max: 50)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const type = searchParams.get("type");

        //  Trending 
        if (type === "trending") {
            const data = await animeProvider.getTrending();
            return ApiResponse.ok(data);
        }

        //  Popular ─
        if (type === "popular") {
            const data = await animeProvider.getPopular();
            return ApiResponse.ok(data);
        }

        //  Seasonal 
        if (type === "seasonal") {
            const season = searchParams.get("season");
            const yearParam = searchParams.get("year");

            if (!season || !yearParam) {
                return ApiResponse.badRequest(
                    "season and year are required for type=seasonal",
                );
            }

            const year = Number(yearParam);

            if (isNaN(year) || year < 1900 || year > 2100) {
                return ApiResponse.badRequest("Invalid year");
            }

            const validSeasons = ["winter", "spring", "summer", "fall"];

            if (!validSeasons.includes(season.toLowerCase())) {
                return ApiResponse.badRequest(
                    `Invalid season. Must be one of: ${validSeasons.join(", ")}`,
                );
            }

            const data = await animeProvider.getSeasonal(
                season.toLowerCase(),
                year,
            );

            return ApiResponse.ok(data);
        }

        //  Search (default) 
        const rawParams = {
            q: searchParams.get("q") ?? undefined,
            genre: searchParams.get("genre") ?? undefined,
            year: searchParams.get("year") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            sort: searchParams.get("sort") ?? undefined,
            page: searchParams.get("page") ?? undefined,
            limit: searchParams.get("limit") ?? undefined,
        };

        const parsed = searchQuerySchema.safeParse(rawParams);

        if (!parsed.success) {
            const firstError =
                parsed.error.issues[0]?.message ?? "Invalid search parameters";
            return ApiResponse.badRequest(firstError);
        }

        const { q, genre, year, status, sort, page, limit } = parsed.data;

        const data = await animeProvider.search({
            query: q,
            genreIds: genre,
            year,
            status,
            sort,
            page,
            limit,
        });

        return ApiResponse.ok(data);
    } catch (error) {
        console.error("[GET /api/anime]", error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch anime";

        return ApiResponse.error(message);
    }
}

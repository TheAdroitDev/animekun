import { type NextRequest } from "next/server";

import { ApiResponse } from "@/lib/utils/api-response";
import { VALID_GENRE_IDS } from "@/lib/constants/genres";
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

        // ── Trending ─────────────────────────────────────────────
        if (type === "trending") {
            const data = await animeProvider.getTrending();
            return ApiResponse.ok(data);
        }

        // ── Popular ──────────────────────────────────────────────
        if (type === "popular") {
            const data = await animeProvider.getPopular();
            return ApiResponse.ok(data);
        }

        // ── Seasonal ─────────────────────────────────────────────
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

        // ── Search (default) ─────────────────────────────────────
        const query = searchParams.get("q") ?? undefined;
        const genreParam = searchParams.get("genre");
        const yearParam = searchParams.get("year");
        const status = searchParams.get("status") as
            | "airing"
            | "complete"
            | "upcoming"
            | null;
        const page = Number(searchParams.get("page") ?? 1);
        const limit = Number(searchParams.get("limit") ?? 25);

        let genreIds: number[] | undefined;

        if (genreParam) {
            const parsed = genreParam.split(",").map(Number);
            const invalid = parsed.filter((n) => isNaN(n) || !VALID_GENRE_IDS.has(n));

            if (invalid.length > 0) {
                return ApiResponse.badRequest(
                    `Invalid genre IDs: ${invalid.join(", ")}`,
                );
            }

            genreIds = parsed;
        }

        const year = yearParam ? Number(yearParam) : undefined;

        if (year !== undefined && (isNaN(year) || year < 1900 || year > 2100)) {
            return ApiResponse.badRequest("Invalid year");
        }

        if (status && !["airing", "complete", "upcoming"].includes(status)) {
            return ApiResponse.badRequest(
                "Invalid status. Must be one of: airing, complete, upcoming",
            );
        }

        const data = await animeProvider.search({
            query,
            genreIds,
            year,
            status: status ?? undefined,
            page: isNaN(page) || page < 1 ? 1 : page,
            limit: isNaN(limit) || limit < 1 ? 25 : Math.min(limit, 50),
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

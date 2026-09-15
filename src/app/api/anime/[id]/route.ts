import { type NextRequest } from "next/server";

import { ApiResponse } from "@/lib/utils/api-response";
import { animeProvider } from "@/services/anime-provider";

/**
 * GET /api/anime/[id]
 *
 * Query params:
 *   include — "characters" to also fetch the character list
 *
 * Returns the full anime detail. Optionally includes characters.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;

    try {
        if (!id) {
            return ApiResponse.badRequest("Anime ID is required");
        }

        const { searchParams } = request.nextUrl;
        const include = searchParams.get("include");

        const anime = await animeProvider.getAnimeById(id);

        // Optionally include characters in the same response
        if (include === "characters") {
            const characters = await animeProvider.getCharacters(id);

            return ApiResponse.ok({
                ...anime,
                characters,
            });
        }

        return ApiResponse.ok(anime);
    } catch (error) {
        console.error(`[GET /api/anime/${id}]`, error);

        const message =
            error instanceof Error
                ? error.message
                : "Failed to fetch anime detail";

        return ApiResponse.error(message);
    }
}

import { animeProvider } from "@/services/anime-provider";

import type { Recommendation, ResolvedRecommendation } from "../types";

/**
 * Match each AI title to a real anime (server only), in parallel. A lookup
 * that fails or times out just leaves that card unlinked: the user already
 * spent a try, so this never fails the request. If two titles match the
 * same anime, the later one is dropped.
 */
export async function resolveRecommendations(
    recommendations: Recommendation[],
): Promise<ResolvedRecommendation[]> {
    const lookups = await Promise.allSettled(
        recommendations.map((r) => animeProvider.findByTitle(r.title)),
    );

    const seen = new Set<string>();
    const resolved: ResolvedRecommendation[] = [];

    recommendations.forEach((recommendation, i) => {
        const lookup = lookups[i];
        if (lookup.status === "rejected") {
            console.warn(`[generate] title lookup failed for "${recommendation.title}":`, lookup.reason);
        }

        const anime = lookup.status === "fulfilled" ? lookup.value : null;
        if (anime) {
            if (seen.has(anime.id)) return;
            seen.add(anime.id);
        }
        resolved.push({ ...recommendation, anime });
    });

    return resolved;
}

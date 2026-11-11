import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/config/site";
import { ROUTES } from "@/lib/constants/route";
import { animeProvider } from "@/services/anime-provider";

// Regenerate at most once a day (one pair of Tenrai calls per day).
export const revalidate = 86400;

/**
 * Static pages + currently trending/popular anime. Google discovers the rest
 * of the catalogue through related/recommendation links on detail pages.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const siteUrl = getSiteUrl();
    const now = new Date();

    const staticEntries: MetadataRoute.Sitemap = [
        { url: `${siteUrl}${ROUTES.HOME}`, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${siteUrl}${ROUTES.SEARCH}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ];

    // Upstream failure must not break the sitemap — fall back to static pages.
    const lists = await Promise.allSettled([
        animeProvider.getTrending(),
        animeProvider.getPopular(),
    ]);

    const ids = new Set<string>();
    for (const result of lists) {
        if (result.status === "fulfilled") {
            for (const anime of result.value) ids.add(anime.id);
        }
    }

    const animeEntries: MetadataRoute.Sitemap = [...ids].map((id) => ({
        url: `${siteUrl}${ROUTES.ANIME_DETAIL(id)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [...staticEntries, ...animeEntries];
}

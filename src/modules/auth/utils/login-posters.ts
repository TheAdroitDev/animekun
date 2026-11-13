import { FEATURED_POSTERS } from "@/lib/constants/featured-posters";
import { getCurrentSeason } from "@/lib/utils/get-current-season";
import { animeProvider } from "@/services/anime-provider";

/** Enough variety for the 315-tile dome (~5 copies each) without a heavy download. */
const MAX_POSTERS = 60;

/**
 * MAL serves each poster in sizes: ".../47347l.webp" (large, ~386px wide,
 * ~46KB) and ".../47347.webp" (medium, ~225px, ~22KB). Dome tiles are
 * 100–170px wide, so medium is plenty and halves the download.
 */
const MAL_LARGE_POSTER = /^(https:\/\/cdn\.myanimelist\.net\/images\/anime\/.+?)l(\.(?:webp|jpg))$/;

const toMediumSize = (url: string) => url.replace(MAL_LARGE_POSTER, "$1$2");

/**
 * Poster URLs for the login dome: popular + current season + trending from
 * Tenrai, topped up with the hand-picked featured list, de-duplicated.
 *
 * Server-only. Runs at build time and on ISR revalidation of /auth/login
 * (at most once per `revalidate` window), never per visitor. Images are
 * then loaded by the browser straight from MAL's CDN.
 *
 * Never throws: if Tenrai is down/slow, the failed lists are skipped and
 * the featured posters keep the dome full (the build never breaks).
 */
export async function getLoginPosters(): Promise<string[]> {
    const { season, year } = getCurrentSeason();

    const results = await Promise.allSettled([
        animeProvider.getPopular(),
        animeProvider.getSeasonal(season, year),
        animeProvider.getTrending(),
    ]);

    const urls = new Set<string>();

    for (const result of results) {
        if (result.status !== "fulfilled") continue;
        for (const anime of result.value) {
            if (anime.posterUrl) urls.add(toMediumSize(anime.posterUrl));
        }
    }

    for (const poster of FEATURED_POSTERS) {
        urls.add(toMediumSize(poster.posterUrl));
    }

    return [...urls].slice(0, MAX_POSTERS);
}

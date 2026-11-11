import type { Metadata } from "next";
import { Suspense } from "react";

import { ROUTES } from "@/lib/constants/route";
import { AnimeGrid } from "@/modules/anime/components/AnimeGrid";

import { SearchContent } from "./SearchContent";

export const metadata: Metadata = {
    title: "Search Anime | AnimeKun",
    description:
        "Search the anime catalogue by title, filter across 20+ genres, year, status and more on AnimeKun.",
    alternates: {
        canonical: ROUTES.SEARCH,
    },
};

/**
 * Static page: it does NOT read searchParams on the server, so it's
 * prerendered once and served from the CDN. All query handling happens in
 * <SearchContent> on the client (useSearchParams + history API), and data
 * comes from the CDN-cached /api/anime route.
 */
export default function SearchPage() {
    return (
        <section className="search-section">
            <div className="search-container">
                <Suspense fallback={<SearchFallback />}>
                    <SearchContent />
                </Suspense>
            </div>
        </section>
    );
}

function SearchFallback() {
    return (
        <div className="search-page-layout">
            <div className="search-header-container">
                <div className="search-header-text">
                    <h1 className="search-title">Explore Anime</h1>
                    <p className="search-subtitle">
                        Search by title, filter across 20+ genres, or discover seasonal staples.
                    </p>
                </div>
            </div>
            <main className="search-results-area">
                <AnimeGrid isLoading />
            </main>
        </div>
    );
}

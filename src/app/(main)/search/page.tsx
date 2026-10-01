import { Suspense } from "react";
import type { Metadata } from "next";

import { SearchContent } from "./SearchContent";

export const metadata: Metadata = {
    title: "Search Anime | AnimeKun",
    description: "Discover anime by title, genre, year, and status with AnimeKun's real-time anime search engine.",
    openGraph: {
        title: "Search Anime | AnimeKun",
        description: "Discover anime by title, genre, year, and status with AnimeKun's real-time anime search engine.",
    },
};

interface SearchPageProps {
    searchParams: Promise<{
        q?: string;
        genre?: string;
    }>;
}

function SearchPageFallback() {
    return (
        <div className="search-page-layout">
            <div className="search-header-container">
                <div className="detail-skeleton" style={{ width: 220, height: 32, marginBottom: 8 }} />
                <div className="detail-skeleton" style={{ width: 340, height: 16, marginBottom: 24 }} />
                <div className="detail-skeleton" style={{ width: "100%", height: 50, borderRadius: 12 }} />
            </div>
        </div>
    );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
    const { q, genre } = await searchParams;

    return (
        <section className="search-section">
            <div className="search-container">
                <Suspense fallback={<SearchPageFallback />}>
                    <SearchContent initialQuery={q} initialGenre={genre} />
                </Suspense>
            </div>
        </section>
    );
}

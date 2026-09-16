"use client";

import Link from "next/link";

import { usePopular } from "@/modules/anime";
import { AnimeGrid } from "./AnimeGrid";

export function PopularGrid() {
    const { data: anime, isLoading, error } = usePopular();

    return (
        <div className="popular-grid-section">
            <AnimeGrid
                anime={anime}
                isLoading={isLoading}
                error={error}
                skeletonCount={12}
            />

            {anime && anime.length > 0 && (
                <div className="popular-grid-footer">
                    <Link href="/search?sort=popular" className="popular-grid-view-all">
                        View All Popular →
                    </Link>
                </div>
            )}
        </div>
    );
}

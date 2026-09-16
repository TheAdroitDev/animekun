"use client";

import { usePopular } from "@/modules/anime";
import { AnimeGrid } from "./AnimeGrid";

export function PopularGrid() {
    const { data: anime, isLoading, error } = usePopular();

    return (
        <AnimeGrid
            anime={anime}
            isLoading={isLoading}
            error={error}
            skeletonCount={12}
        />
    );
}

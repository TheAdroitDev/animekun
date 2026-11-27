import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";
import type { Anime } from "@/modules/anime/types";

interface AnimeGridProps {
    anime?: Anime[];
    isLoading?: boolean;
    error?: Error | null;
    skeletonCount?: number;
    /** How many leading cards load eagerly (the first row, when the grid is
     *  at the top of the page). 0 elsewhere, e.g. grids below the home hero. */
    eagerCount?: number;
}

export function AnimeGrid({
    anime,
    isLoading,
    error,
    skeletonCount = 12,
    eagerCount = 0,
}: AnimeGridProps) {
    if (error) {
        return (
            <p className="anime-grid-error">
                Failed to load anime. Please try again.
            </p>
        );
    }

    return (
        <div className="anime-grid">
            {isLoading &&
                Array.from({ length: skeletonCount }).map((_, i) => (
                    <AnimeCardSkeleton key={i} />
                ))}

            {anime?.map((item, i) => (
                <AnimeCard key={item.id} anime={item} eager={i < eagerCount} />
            ))}
        </div>
    );
}

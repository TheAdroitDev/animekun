import { AnimeCard } from "./AnimeCard";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";
import type { Anime } from "@/modules/anime/types";

interface AnimeGridProps {
    anime?: Anime[];
    isLoading?: boolean;
    error?: Error | null;
    skeletonCount?: number;
}

export function AnimeGrid({
    anime,
    isLoading,
    error,
    skeletonCount = 12,
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

            {anime?.map((item) => (
                <AnimeCard key={item.id} anime={item} />
            ))}
        </div>
    );
}

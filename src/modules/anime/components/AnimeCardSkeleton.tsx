export function AnimeCardSkeleton() {
    return (
        <div className="anime-card-skeleton">
            <div className="anime-card-skeleton-poster" />
            <div className="anime-card-skeleton-info">
                <div className="anime-card-skeleton-title" />
                <div className="anime-card-skeleton-title anime-card-skeleton-title-short" />
                <div className="anime-card-genres">
                    <div className="anime-card-skeleton-tag" />
                    <div className="anime-card-skeleton-tag" />
                </div>
            </div>
        </div>
    );
}

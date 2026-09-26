import Image from "next/image";

import type { AnimeDetail } from "@/modules/anime/types";

interface AnimeDetailHeaderProps {
    anime: AnimeDetail;
    // Resolved poster URL (already through ImageKit if available) 
    posterSrc: string | null;
    airedFrom: string | null;
    airedTo: string | null;
}

export function AnimeDetailHeader({
    anime,
    posterSrc,
    airedFrom,
    airedTo,
}: AnimeDetailHeaderProps) {
    return (
        <div className="detail-banner-wrap">

            {posterSrc && (
                <div className="detail-banner-bg" aria-hidden="true">
                    <Image
                        src={posterSrc}
                        alt="posterSrc"
                        fill
                        className="detail-banner-bg-img"
                        priority
                        unoptimized
                    />
                </div>
            )}


            <div className="detail-header">
                <div className="detail-poster">
                    {posterSrc ? (
                        <Image
                            src={posterSrc}
                            alt={anime.title}
                            width={260}
                            height={390}
                            className="detail-poster-img"
                            priority
                            unoptimized
                        />
                    ) : (
                        <div className="detail-poster-placeholder">No Image</div>
                    )}
                </div>

                <div className="detail-header-info">
                    <h1 className="detail-title">{anime.title}</h1>


                    <div className="detail-meta-line">
                        {anime.score !== null && (
                            <span className="detail-score-badge">★ {anime.score.toFixed(2)}</span>
                        )}
                        {anime.type && <span className="detail-meta-tag">{anime.type}</span>}
                        {anime.episodes !== null && (
                            <span className="detail-meta-tag">{anime.episodes} eps</span>
                        )}
                        {anime.status && (
                            <span className="detail-status-badge">{anime.status}</span>
                        )}
                    </div>


                    {anime.genres.length > 0 && (
                        <div className="detail-genres">
                            {anime.genres.map((g) => (
                                <span key={g} className="detail-genre-pill">{g}</span>
                            ))}
                        </div>
                    )}


                    {anime.studios.length > 0 && (
                        <p className="detail-info-row">
                            <span className="detail-info-row-label">Studio</span>
                            <span className="detail-info-row-value">{anime.studios.join(", ")}</span>
                        </p>
                    )}

                    {airedFrom && (
                        <p className="detail-info-row">
                            <span className="detail-info-row-label">Aired</span>
                            <span className="detail-info-row-value">
                                {airedFrom}{airedTo ? ` — ${airedTo}` : ""}
                            </span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

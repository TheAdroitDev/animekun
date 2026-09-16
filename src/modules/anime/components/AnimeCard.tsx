import { Image as IKImage } from "@imagekit/next";
import NextImage from "next/image";
import Link from "next/link";

import { getImageKitConfig } from "@/lib/config/imagekit";
import { ROUTES } from "@/lib/constants/route";
import type { Anime } from "@/modules/anime/types";

interface AnimeCardProps {
    anime: Anime;
}

export function AnimeCard({ anime }: AnimeCardProps) {
    const { urlEndpoint } = getImageKitConfig();

    return (
        <Link href={ROUTES.ANIME_DETAIL(anime.id)} className="anime-card">
            {/* Poster */}
            <div className="anime-card-poster">
                {anime.posterUrl ? (
                    urlEndpoint ? (
                        <IKImage
                            urlEndpoint={urlEndpoint}
                            src={
                                anime.posterUrl.startsWith("http")
                                    ? `${urlEndpoint.replace(/\/$/, "")}/${anime.posterUrl}`
                                    : anime.posterUrl
                            }
                            alt={anime.title}
                            fill
                            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 200px"
                            className="anime-card-img"
                            transformation={[
                                {
                                    width: 300,
                                    height: 450,
                                    quality: 80,
                                },
                            ]}
                        />
                    ) : (
                        <NextImage
                            src={anime.posterUrl}
                            alt={anime.title}
                            fill
                            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 200px"
                            className="anime-card-img"
                        />
                    )
                ) : (
                    <div className="anime-card-no-img">
                        <span>No Image</span>
                    </div>
                )}

                {/* Score badge — top right overlay */}
                {anime.score !== null && (
                    <div className="anime-card-score">
                        ★ {anime.score.toFixed(1)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="anime-card-info">
                <h3 className="anime-card-title">{anime.title}</h3>

                {/* Genre tags — show max 2 */}
                {anime.genres.length > 0 && (
                    <div className="anime-card-genres">
                        {anime.genres.slice(0, 2).map((genre) => (
                            <span key={genre} className="anime-card-genre-tag">
                                {genre}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </Link>
    );
}

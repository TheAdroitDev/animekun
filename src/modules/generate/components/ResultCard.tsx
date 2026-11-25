import type { CSSProperties } from "react";
import Link from "next/link";
import { Film, Star } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";
import { cardPoster } from "@/modules/bookmarks/utils/poster";

import type { ResolvedRecommendation } from "../types";

interface ResultCardProps {
    recommendation: ResolvedRecommendation;
    index: number;
}

/**
 * One AI recommendation (step 8.7). Matched anime: poster, title link to
 * /anime/[id] (the whole card is clickable via the link's ::after), year and
 * score. Unmatched: the AI's title, no link. Posters come straight from the
 * MAL CDN, never through /_next/image.
 */
export function ResultCard({ recommendation, index }: ResultCardProps) {
    const { anime, title, reason, confidence } = recommendation;
    const match = Math.round(confidence * 100);
    const poster = anime?.posterUrl ? cardPoster(anime.posterUrl) : null;
    const meta = anime ? [anime.year, anime.score != null ? anime.score.toFixed(2) : null] : [];

    return (
        // --i staggers the reveal animation (see .gen-result in globals.css).
        <li className="gen-result gen-card" style={{ "--i": index } as CSSProperties}>
            <div className="gen-card-poster">
                {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={poster.desktop ?? poster.src}
                        alt=""
                        width={72}
                        height={102}
                        loading="lazy"
                        decoding="async"
                    />
                ) : (
                    <Film size={22} aria-hidden="true" />
                )}
            </div>

            <div className="gen-card-body">
                <div className="gen-card-head">
                    {anime ? (
                        <Link href={ROUTES.ANIME_DETAIL(anime.id)} prefetch={false} className="gen-card-title gen-card-link">
                            {anime.title}
                        </Link>
                    ) : (
                        <span className="gen-card-title">{title}</span>
                    )}
                    <span className="gen-card-match" title="How well it matches your request">
                        {match}% match
                    </span>
                </div>

                <span className="gen-card-meta">
                    {anime ? (
                        <>
                            {meta[0] && <span>{meta[0]}</span>}
                            {meta[1] && (
                                <span className="gen-card-score">
                                    <Star size={12} aria-hidden="true" /> {meta[1]}
                                </span>
                            )}
                        </>
                    ) : (
                        "Not on AnimeKun yet"
                    )}
                </span>

                <p className="gen-result-reason">{reason}</p>
            </div>
        </li>
    );
}

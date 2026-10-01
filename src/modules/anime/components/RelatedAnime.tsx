import { AnimeCard } from "@/modules/anime/components/AnimeCard";
import type { Anime } from "@/modules/anime/types";

interface RelatedAnimeProps {
    related?: Anime[];
    recommendations?: Anime[];
}

export function RelatedAnime({ related = [], recommendations = [] }: RelatedAnimeProps) {
    if (related.length === 0 && recommendations.length === 0) return null;

    return (
        <>
            {/*  Related Anime (Sequels, Prequels, Side Stories) ── */}
            {related.length > 0 && (
                <div className="detail-block">
                    <h2 className="detail-block-heading">Related Anime</h2>
                    <div className="detail-recommendations-grid">
                        {related.map((anime) => (
                            <AnimeCard key={`${anime.id}-${anime.genres[0] || "rel"}`} anime={anime} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Recommendations ── */}
            {recommendations.length > 0 && (
                <div className="detail-block">
                    <h2 className="detail-block-heading">Recommended Anime</h2>
                    <div className="detail-recommendations-grid">
                        {recommendations.map((anime) => (
                            <AnimeCard key={anime.id} anime={anime} />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

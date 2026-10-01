import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import { animeProvider } from "@/services/anime-provider";
import { getImageKitConfig } from "@/lib/config/imagekit";
import { ROUTES } from "@/lib/constants/route";
import { AnimeDetailHeader } from "@/modules/anime/components/AnimeDetailHeader";
import { AnimeSynopsis } from "@/modules/anime/components/AnimeSynopsis";
import { CharacterGrid } from "@/modules/anime/components/CharacterGrid";
import { RelatedAnime } from "@/modules/anime/components/RelatedAnime";
import type { Anime, Character } from "@/modules/anime";


//  React cache() deduplicates getAnimeById between generateMetadata and the
// page render — single upstream API call per request, zero wasted fetches.

const getAnimeDetail = cache((id: string) => animeProvider.getAnimeById(id));

interface AnimeDetailPageProps {
    params: Promise<{ id: string }>;
}

// Dynamic SEO Metadata 

export async function generateMetadata(
    { params }: AnimeDetailPageProps,
): Promise<Metadata> {
    const { id } = await params;
    const { urlEndpoint } = getImageKitConfig();

    try {
        const anime = await getAnimeDetail(id);
        const cleanSynopsis = anime.synopsis
            ? anime.synopsis.replace(/\s+/g, " ").trim().slice(0, 160)
            : `Discover ${anime.title} on AnimeKun — scores, characters, and more.`;

        const title = `${anime.title} | AnimeKun`;
        const poster = resolveImage(anime.posterUrl, urlEndpoint);

        return {
            title,
            description: cleanSynopsis,
            keywords: [
                anime.title,
                ...anime.genres,
                ...anime.studios,
                "anime",
                "AnimeKun",
                "recommendations",
            ].filter(Boolean),
            openGraph: {
                title,
                description: cleanSynopsis,
                url: ROUTES.ANIME_DETAIL(anime.id),
                siteName: "AnimeKun",
                type: "website",
                ...(poster && {
                    images: [
                        {
                            url: poster,
                            width: 600,
                            height: 900,
                            alt: anime.title,
                        },
                    ],
                }),
            },
            twitter: {
                card: "summary_large_image",
                title,
                description: cleanSynopsis,
                ...(poster && { images: [poster] }),
            },
            alternates: {
                canonical: ROUTES.ANIME_DETAIL(anime.id),
            },
        };
    } catch {
        return {
            title: "Anime Not Found | AnimeKun",
            description: "The requested anime could not be found on AnimeKun.",
        };
    }
}

//  Helpers 

function resolveImage(url: string | null, endpoint: string): string | null {
    if (!url || !endpoint) return url;
    if (url.startsWith(endpoint)) return url;
    return `${endpoint.replace(/\/$/, "")}/${url}`;
}

function formatDate(iso: string | null): string | null {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    } catch {
        return null;
    }
}

//  Page (Server Component) 

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
    const { id } = await params;
    const { urlEndpoint } = getImageKitConfig();

    // Anime is critical (404 if missing); characters + recommendations are supplementary
    const [anime, characters, recommendations] = await Promise.all([
        getAnimeDetail(id).catch(() => null),
        animeProvider.getCharacters(id).catch((): Character[] => []),
        animeProvider.getRecommendations(id).catch((): Anime[] => []),
    ]);

    if (!anime) notFound();

    const poster = resolveImage(anime.posterUrl, urlEndpoint);
    const airedFrom = formatDate(anime.airingFrom);
    const airedTo = formatDate(anime.airingTo);

    const infoItems = [
        anime.type && { label: "Type", value: anime.type },
        anime.source && { label: "Source", value: anime.source },
        anime.episodes !== null && { label: "Episodes", value: String(anime.episodes) },
        anime.duration && { label: "Duration", value: anime.duration },
        anime.rating && { label: "Rating", value: anime.rating },
        anime.popularity !== null && { label: "Popularity", value: `#${anime.popularity}` },
        airedFrom && {
            label: "Aired",
            value: airedTo ? `${airedFrom} — ${airedTo}` : airedFrom,
        },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <section className="detail-section">
            <div className="detail-container">
                {/*  Breadcrumb  */}
                <nav className="detail-breadcrumb" aria-label="Breadcrumb">
                    <Link href={ROUTES.HOME} className="detail-breadcrumb-link">Home</Link>
                    <span className="detail-breadcrumb-sep">/</span>
                    <Link href={ROUTES.SEARCH} className="detail-breadcrumb-link">Anime</Link>
                    <span className="detail-breadcrumb-sep">/</span>
                    <span className="detail-breadcrumb-current">{anime.title}</span>
                </nav>

                {/*  Header: Banner + Poster + Core Info  */}
                <AnimeDetailHeader
                    anime={anime}
                    posterSrc={poster}
                    airedFrom={airedFrom}
                    airedTo={airedTo}
                />

                {/*  Synopsis + Info Grid  */}
                <AnimeSynopsis
                    synopsis={anime.synopsis}
                    infoItems={infoItems}
                />

                {/*  Characters  */}
                <CharacterGrid characters={characters} />

                {/* ── Related & Recommendations ── */}
                <RelatedAnime
                    related={anime.relations}
                    recommendations={recommendations}
                />
            </div>
        </section>
    );
}

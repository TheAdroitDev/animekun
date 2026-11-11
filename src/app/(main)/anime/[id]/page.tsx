import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";

import { animeProvider } from "@/services/anime-provider";
import { getImageKitConfig } from "@/lib/config/imagekit";
import { ApiError } from "@/lib/utils/api-error";
import { ROUTES } from "@/lib/constants/route";
import { AnimeDetailHeader } from "@/modules/anime/components/AnimeDetailHeader";
import { AnimeSynopsis } from "@/modules/anime/components/AnimeSynopsis";
import { CharacterGrid } from "@/modules/anime/components/CharacterGrid";
import { RelatedAnime } from "@/modules/anime/components/RelatedAnime";
import type { Anime, Character } from "@/modules/anime";


//  React cache() deduplicates getAnimeById between generateMetadata and the
// page render — single upstream API call per request, zero wasted fetches.

const getAnimeDetail = cache((id: string) => animeProvider.getAnimeById(id));

// ISR: each anime page is rendered on its first visit, then served from
// Vercel's cache and regenerated in the background at most once a day.
// No pages are built at deploy time (empty generateStaticParams), so build
// time stays flat while ~28k anime remain reachable on demand.
export const revalidate = 86400;
export const dynamicParams = true;

export async function generateStaticParams() {
    return [];
}

// MAL IDs are positive integers — reject junk URLs without calling Tenrai.
const isValidAnimeId = (id: string) => /^[1-9]\d{0,9}$/.test(id);

const isUpstreamNotFound = (error: unknown) =>
    error instanceof ApiError && error.statusCode === 404;

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

    if (!isValidAnimeId(id)) notFound();

    // Only the detail call blocks the page. Characters and recommendations
    // stream in via <Suspense> below, so a slow secondary call no longer
    // delays the whole page.
    // Only a real upstream 404 becomes notFound(). Outages/timeouts rethrow so
    // the error boundary renders and ISR keeps serving the last good page,
    // instead of telling Google the page doesn't exist.
    const anime = await getAnimeDetail(id).catch((error: unknown) => {
        if (isUpstreamNotFound(error)) return null;
        throw error;
    });

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

                {/*  Characters (streamed)  */}
                <Suspense fallback={<SectionSkeleton />}>
                    <CharactersSection id={id} />
                </Suspense>

                {/* ── Related (already in the detail response) ── */}
                <RelatedAnime related={anime.relations} />

                {/* ── Recommendations (streamed) ── */}
                <Suspense fallback={<SectionSkeleton />}>
                    <RecommendationsSection id={id} />
                </Suspense>
            </div>
        </section>
    );
}

//  Streamed sections
// Each fetches its own data. On failure/timeout they render nothing, so a
// slow Tenrai call only affects its own section.

async function CharactersSection({ id }: { id: string }) {
    const characters = await animeProvider
        .getCharacters(id)
        .catch((): Character[] => []);

    return <CharacterGrid characters={characters} />;
}

async function RecommendationsSection({ id }: { id: string }) {
    const recommendations = await animeProvider
        .getRecommendations(id)
        .catch((): Anime[] => []);

    return <RelatedAnime recommendations={recommendations} />;
}

function SectionSkeleton() {
    return (
        <div className="detail-block" aria-hidden="true">
            <div className="detail-skeleton" style={{ width: 160, height: 22, marginBottom: 16 }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {Array.from({ length: 6 }, (_, i) => (
                    <div
                        key={i}
                        className="detail-skeleton"
                        style={{ width: 120, height: 170, borderRadius: 12 }}
                    />
                ))}
            </div>
        </div>
    );
}

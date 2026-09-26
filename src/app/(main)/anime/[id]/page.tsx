import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { animeProvider } from "@/services/anime-provider";
import { getImageKitConfig } from "@/lib/config/imagekit";
import { ROUTES } from "@/lib/constants/route";
import type { AnimeDetail, Character } from "@/modules/anime";

/**
 * React cache() deduplicates getAnimeById between generateMetadata and the
 * page render — single upstream API call per request, zero wasted fetches.
 */
const getAnimeDetail = cache((id: string) => animeProvider.getAnimeById(id));

interface AnimeDetailPageProps {
    params: Promise<{ id: string }>;
}

// ── Dynamic SEO Metadata ────────────────────────────────────────────────────

export async function generateMetadata(
    { params }: AnimeDetailPageProps,
): Promise<Metadata> {
    const { id } = await params;

    try {
        const anime = await getAnimeDetail(id);
        const description =
            anime.synopsis?.slice(0, 160) ??
            `Discover ${anime.title} on AnimeKun — scores, characters, and more.`;

        return {
            title: `${anime.title} | AnimeKun`,
            description,
            openGraph: {
                title: `${anime.title} | AnimeKun`,
                description,
                ...(anime.posterUrl && { images: [anime.posterUrl] }),
            },
        };
    } catch {
        return { title: "Anime Not Found | AnimeKun" };
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Page (Server Component) ─────────────────────────────────────────────────

export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
    const { id } = await params;
    const { urlEndpoint } = getImageKitConfig();

    // Anime is critical (404 if missing), characters are supplementary
    const [anime, characters] = await Promise.all([
        getAnimeDetail(id).catch(() => null),
        animeProvider.getCharacters(id).catch((): Character[] => []),
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
                {/* ── Breadcrumb ── */}
                <nav className="detail-breadcrumb" aria-label="Breadcrumb">
                    <Link href={ROUTES.HOME} className="detail-breadcrumb-link">Home</Link>
                    <span className="detail-breadcrumb-sep">/</span>
                    <Link href={ROUTES.SEARCH} className="detail-breadcrumb-link">Anime</Link>
                    <span className="detail-breadcrumb-sep">/</span>
                    <span className="detail-breadcrumb-current">{anime.title}</span>
                </nav>

                {/* ── Header: Poster + Core Info ── */}
                <div className="detail-header">
                    <div className="detail-poster">
                        {poster ? (
                            <Image
                                src={poster}
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

                {/* ── Synopsis ── */}
                {anime.synopsis && (
                    <div className="detail-block">
                        <h2 className="detail-block-heading">Synopsis</h2>
                        <p className="detail-synopsis">{anime.synopsis}</p>
                    </div>
                )}

                {/* ── Info Grid ── */}
                {infoItems.length > 0 && (
                    <div className="detail-block">
                        <h2 className="detail-block-heading">Information</h2>
                        <div className="detail-info-grid">
                            {infoItems.map((item) => (
                                <div key={item.label} className="detail-info-cell">
                                    <span className="detail-info-cell-label">{item.label}</span>
                                    <span className="detail-info-cell-value">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Characters ── */}
                {characters.length > 0 && (
                    <div className="detail-block">
                        <h2 className="detail-block-heading">Characters</h2>
                        <div className="detail-characters-grid">
                            {characters.slice(0, 12).map((c) => (
                                <div key={c.id} className="detail-char-card">
                                    <div className="detail-char-img-wrap">
                                        {c.imageUrl ? (
                                            <Image
                                                src={resolveImage(c.imageUrl, urlEndpoint) ?? c.imageUrl}
                                                alt={c.name}
                                                width={68}
                                                height={90}
                                                className="detail-char-img"
                                                unoptimized
                                            />
                                        ) : (
                                            <div className="detail-char-no-img">
                                                {c.name.slice(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="detail-char-info">
                                        <span className="detail-char-name">{c.name}</span>
                                        {c.role && <span className="detail-char-role">{c.role}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}

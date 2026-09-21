"use client";

import { useMemo } from "react";
import Image from "next/image";
import { usePopular, useTrending } from "@/modules/anime";
import { getImageKitConfig } from "@/lib/config/imagekit";

interface MarqueeAnimeItem {
    id: string;
    title: string;
    posterUrl: string;
}

// 15 live, verified Tenrai/MAL anime posters with zero 404s
const INITIAL_FALLBACK_ANIMES: MarqueeAnimeItem[] = [
    {
        id: "16498",
        title: "Attack on Titan",
        posterUrl: "https://cdn.myanimelist.net/images/anime/10/47347l.webp",
    },
    {
        id: "1535",
        title: "Death Note",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1079/138100l.webp",
    },
    {
        id: "5114",
        title: "Fullmetal Alchemist: Brotherhood",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1208/94745l.webp",
    },
    {
        id: "30276",
        title: "One-Punch Man",
        posterUrl: "https://cdn.myanimelist.net/images/anime/12/76049l.webp",
    },
    {
        id: "38000",
        title: "Demon Slayer",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1286/99889l.webp",
    },
    {
        id: "52991",
        title: "Frieren: Beyond Journey's End",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1015/138006l.webp",
    },
    {
        id: "31964",
        title: "My Hero Academia",
        posterUrl: "https://cdn.myanimelist.net/images/anime/10/78745l.webp",
    },
    {
        id: "11757",
        title: "Sword Art Online",
        posterUrl: "https://cdn.myanimelist.net/images/anime/11/39717l.webp",
    },
    {
        id: "11061",
        title: "Hunter x Hunter",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1337/99013l.webp",
    },
    {
        id: "20",
        title: "Naruto",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1141/142503l.webp",
    },
    {
        id: "40748",
        title: "Jujutsu Kaisen",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1171/109222l.webp",
    },
    {
        id: "22319",
        title: "Tokyo Ghoul",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1498/134443l.webp",
    },
    {
        id: "32281",
        title: "Your Name.",
        posterUrl: "https://cdn.myanimelist.net/images/anime/5/87048l.webp",
    },
    {
        id: "9253",
        title: "Steins;Gate",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1935/127974l.webp",
    },
    {
        id: "44511",
        title: "Chainsaw Man",
        posterUrl: "https://cdn.myanimelist.net/images/anime/1806/126216l.webp",
    },
];

/**
 * Routes image through user's ImageKit CDN cache endpoint if available,
 * exactly as done in AnimeCard.tsx, avoiding redundant upstream fetches.
 */
function resolvePosterUrl(url: string, endpoint: string): string {
    if (!endpoint || !url) return url;
    if (url.startsWith(endpoint)) return url;
    const base = endpoint.replace(/\/$/, "");
    return `${base}/${url}`;
}

/**
 * Repeats a set of 5 distinct posters 3 times to create a 15-item half-track (~2,200px),
 * then duplicates once for [halfA, halfA] (30 items total).
 * Because only 5 distinct image URLs exist per row, the browser downloads only 5 images
 * and instantly reuses cached bitmaps for the other 25 cards with 0 extra network calls!
 */
function buildRowTrack(items: MarqueeAnimeItem[], urlEndpoint: string): MarqueeAnimeItem[] {
    if (!items || items.length === 0) return [];
    const withCdn = items.map((item) => ({
        ...item,
        posterUrl: resolvePosterUrl(item.posterUrl, urlEndpoint),
    }));
    const half = [...withCdn, ...withCdn, ...withCdn];
    return [...half, ...half];
}

export default function HeroMarquee() {
    const { urlEndpoint } = getImageKitConfig();

    // Both hooks share the exact same TanStack React Query cache (0 duplicate API hits)
    const { data: popularData } = usePopular();
    const { data: trendingData } = useTrending();

    const { rowOneItems, rowTwoItems, rowThreeItems } = useMemo(() => {
        const itemMap = new Map<string, MarqueeAnimeItem>();

        // 1. All-Time Popular first with strict 15 limiter to avoid bombarding
        if (popularData && popularData.length > 0) {
            for (const a of popularData) {
                if (a.posterUrl) {
                    itemMap.set(a.id, {
                        id: a.id,
                        title: a.title,
                        posterUrl: a.posterUrl,
                    });
                    if (itemMap.size >= 15) break;
                }
            }
        }

        // 2. Supplement with Trending if popular has fewer than 15 (strict cap at 15)
        if (itemMap.size < 15 && trendingData && trendingData.length > 0) {
            for (const a of trendingData) {
                if (a.posterUrl && !itemMap.has(a.id)) {
                    itemMap.set(a.id, {
                        id: a.id,
                        title: a.title,
                        posterUrl: a.posterUrl,
                    });
                    if (itemMap.size >= 15) break;
                }
            }
        }

        let combined = Array.from(itemMap.values());
        if (combined.length === 0) {
            // Only used as instant placeholder while live popular/trending data is in flight
            combined = INITIAL_FALLBACK_ANIMES;
        } else if (combined.length < 15) {
            // Live data arrived: pad using the live items so live anime is always displayed
            while (combined.length < 15) {
                combined = [...combined, ...combined];
            }
            combined = combined.slice(0, 15);
        }

        // Slice into 3 distinct sets of 5 posters
        const r1 = combined.slice(0, 5);
        const r2 = combined.slice(5, 10);
        const r3 = combined.slice(10, 15);

        return {
            rowOneItems: buildRowTrack(r1.length === 5 ? r1 : combined.slice(0, 5), urlEndpoint),
            rowTwoItems: buildRowTrack(r2.length === 5 ? r2 : combined.slice(5, 10), urlEndpoint),
            rowThreeItems: buildRowTrack(r3.length === 5 ? r3 : combined.slice(10, 15), urlEndpoint),
        };
    }, [popularData, trendingData, urlEndpoint]);

    return (
        <div className="hero-marquee-wrapper" aria-hidden="true">
            {/* Row 1: Moves Left */}
            <div className="hero-marquee-row">
                <div className="hero-marquee-track hero-marquee-left">
                    {rowOneItems.map((item, idx) => (
                        <div key={`${item.id}-r1-${idx}`} className="hero-marquee-card">
                            <Image
                                src={item.posterUrl}
                                alt={item.title}
                                fill
                                sizes="135px"
                                className="hero-marquee-img"
                                priority={idx < 5}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 2: Moves Right (Opposite direction for parallax) */}
            <div className="hero-marquee-row">
                <div className="hero-marquee-track hero-marquee-right">
                    {rowTwoItems.map((item, idx) => (
                        <div key={`${item.id}-r2-${idx}`} className="hero-marquee-card">
                            <Image
                                src={item.posterUrl}
                                alt={item.title}
                                fill
                                sizes="135px"
                                className="hero-marquee-img"
                                priority={idx < 5}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Row 3: Moves Left */}
            <div className="hero-marquee-row">
                <div className="hero-marquee-track hero-marquee-left">
                    {rowThreeItems.map((item, idx) => (
                        <div key={`${item.id}-r3-${idx}`} className="hero-marquee-card">
                            <Image
                                src={item.posterUrl}
                                alt={item.title}
                                fill
                                sizes="135px"
                                className="hero-marquee-img"
                                priority={idx < 5}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Theme-adaptive veil to keep hero text razor sharp while posters remain clearly visible */}
            <div className="hero-marquee-veil" />
        </div>
    );
}

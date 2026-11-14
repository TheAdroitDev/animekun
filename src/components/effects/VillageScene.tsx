"use client";

import { useEffect, useRef, useState } from "react";

import type { VillageHandle } from "./line-art/village/mount";

/**
 * Ink village (line-art-animation, MIT) as a lazy, self-pausing card.
 * - The scene's JS (~15KB gz) is downloaded only when the card comes within
 *   300px of the viewport; most visitors never reach it, so it costs nothing.
 * - Animates only while on screen (paused otherwise; rAF also stops in
 *   background tabs). Reduced motion: one still frame.
 * - Mobile: taller 4:3 card cropped to the street's centre; vertical swipes
 *   still scroll the page (touch-action: pan-y). Styles: `.village-*`.
 */
export function VillageScene() {
    const cardRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);
    const [loaded, setLoaded] = useState(false);
    const [hintGone, setHintGone] = useState(false);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        let village: VillageHandle | null = null;
        let loading = false;
        let visible = false;
        let cancelled = false;

        const observer = new IntersectionObserver(
            ([entry]) => {
                visible = entry.isIntersecting;
                if (village) {
                    if (visible) village.resume();
                    else village.pause();
                    return;
                }
                if (!visible || loading) return;
                loading = true;
                import("./line-art/village/mount").then(({ mountVillage }) => {
                    if (cancelled) return;
                    village = mountVillage(card, {
                        clock: clockRef.current,
                        onInteract: () => setHintGone(true),
                    });
                    setLoaded(true);
                    if (visible) village.resume();
                });
            },
            { rootMargin: "300px 0px" },
        );
        observer.observe(card);

        const hintTimer = setTimeout(() => setHintGone(true), 20000);

        return () => {
            cancelled = true;
            observer.disconnect();
            clearTimeout(hintTimer);
            village?.destroy();
        };
    }, []);

    return (
        <div ref={cardRef} className={loaded ? "village-card is-loaded" : "village-card"}>
            <div ref={clockRef} className="village-clock" aria-hidden="true" />
            <p className={hintGone ? "village-hint is-gone" : "village-hint"} aria-hidden="true">
                <span className="village-hint-mouse">drag the sun across the sky · click anyone and anything</span>
                <span className="village-hint-touch">tap anyone · drag the sun</span>
            </p>
        </div>
    );
}

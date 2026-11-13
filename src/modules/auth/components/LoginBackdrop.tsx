"use client";

import dynamic from "next/dynamic";

// Client-only + lazy: the server HTML has just the sign-in card (fast first
// paint, page stays static), and the dome's JS loads only on this page.
const DomeGallery = dynamic(
    () => import("@/components/effects/DomeGallery").then((m) => m.DomeGallery),
    { ssr: false }
);

interface LoginBackdropProps {
    /** Poster URLs, gathered server-side by getLoginPosters(). */
    posters: string[];
}

/** Interactive poster dome behind the login card (decorative). */
export function LoginBackdrop({ posters }: LoginBackdropProps) {
    return (
        <div className="auth-backdrop">
            {/* 9 rows (default 5): the dome is taller than the screen (phones
                included), so its top/bottom edges stay hidden; the left/right
                curve stays visible.
                autoRotateSpeed 3°/s → one full turn every 2 minutes, left→right */}
            <DomeGallery images={posters} rows={9} autoRotateSpeed={3} />
        </div>
    );
}

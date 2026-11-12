import type { NextConfig } from "next";

// Security headers for every route. Applied by Vercel's routing layer, so
// they cost nothing per request (unlike setting them in the proxy).
const securityHeaders = [
    // Other sites can't embed our pages in a frame (clickjacking)
    { key: "X-Frame-Options", value: "DENY" },
    // Browsers must not guess content types (blocks some injection tricks)
    { key: "X-Content-Type-Options", value: "nosniff" },
    // External sites see only our origin, not full URLs (e.g. search terms)
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Disable powerful features the site doesn't use
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
    images: {
        remotePatterns: [
            {
                // MyAnimeList CDN — used by Tenrai API for anime posters
                protocol: "https",
                hostname: "cdn.myanimelist.net",
            },
            {
                // ImageKit CDN for optimized anime images
                protocol: "https",
                hostname: "ik.imagekit.io",
            },
        ],
    },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                // MyAnimeList CDN — used by Tenrai API for anime posters
                protocol: "https",
                hostname: "cdn.myanimelist.net",
            },
        ],
    },
};

export default nextConfig;

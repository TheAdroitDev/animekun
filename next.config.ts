import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

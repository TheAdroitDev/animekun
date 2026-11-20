import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/config/site";

/**
 * - /search (no params) and /anime/* stay crawlable: they bring Google traffic.
 * - /search?... is an endless space of filter combinations: block crawling it.
 *   (Google uses the most specific rule, so "/search?" wins over "/".)
 * - /api/ is data for our own UI, not pages.
 * - AI training crawlers are blocked everywhere: on 2026-11-20 ClaudeBot made
 *   ~13k requests in 6h, each new /anime/[id] a fresh render + 3 Tenrai calls,
 *   pushing Active CPU toward the Hobby limit. They bring no visitors. (The
 *   Vercel Firewall "AI Crawlers: Deny" rule also blocks them; this is the
 *   backup.) A bot that matches its own group ignores the "*" group.
 */
const AI_TRAINING_CRAWLERS = [
    "ClaudeBot",
    "GPTBot",
    "CCBot",
    "Bytespider",
    "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
    const siteUrl = getSiteUrl();

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/search?"],
            },
            {
                userAgent: AI_TRAINING_CRAWLERS,
                disallow: "/",
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}

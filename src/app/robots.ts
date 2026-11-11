import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/config/site";

/**
 * - /search (no params) and /anime/* stay crawlable: they bring Google traffic.
 * - /search?... is an endless space of filter combinations: block crawling it.
 *   (Google uses the most specific rule, so "/search?" wins over "/".)
 * - /api/ is data for our own UI, not pages.
 */
export default function robots(): MetadataRoute.Robots {
    const siteUrl = getSiteUrl();

    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: ["/api/", "/search?"],
            },
        ],
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}

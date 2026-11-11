/**
 * Absolute site origin for SEO files (robots, sitemap).
 * Priority: explicit NEXT_PUBLIC_SITE_URL → Vercel's production domain
 * (system env, set automatically on Vercel) → localhost for dev.
 */
export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL;
    if (explicit) return explicit.replace(/\/$/, "");

    const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (vercelProd) return `https://${vercelProd}`;

    return "http://localhost:3000";
}

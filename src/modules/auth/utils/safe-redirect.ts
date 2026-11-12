/**
 * Returns a safe in-app path to redirect to after auth.
 *
 * Only relative paths are allowed ("/bookmarks?tab=1"). Anything else
 * ("https://evil.com", "//evil.com", "/\\evil.com", "javascript:...")
 * falls back, preventing open-redirect attacks via ?redirect=.
 */

export function getSafeRedirect(
    value: string | null | undefined,
    fallback = "/",
): string {
    if (!value) return fallback;
    if (!value.startsWith("/")) return fallback;
    if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
    return value;
}

// Reads ?redirect= from the current URL (client only, at call time).
export function getRedirectFromLocation(fallback = "/"): string {
    if (typeof window === "undefined") return fallback;
    const value = new URLSearchParams(window.location.search).get("redirect");
    return getSafeRedirect(value, fallback);
}

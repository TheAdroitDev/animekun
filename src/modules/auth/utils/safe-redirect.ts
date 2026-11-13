// Dummy origin used only to parse/normalise paths; never navigated to.
const PARSE_BASE = "https://animekun.invalid";

/**
 * Returns a safe in-app path to redirect to after auth, or `fallback`.
 *
 * Accepts only same-origin relative paths like "/bookmarks?tab=1".
 * Rejects anything a browser could resolve to another site:
 * - "https://evil.com", "javascript:…" (not starting with "/")
 * - "//evil.com" (protocol-relative)
 * - "/\evil.com" (browsers treat "\" like "/")
 * - "/<TAB>/evil.com", "/<LF>/evil.com" (URL parsers strip tab/CR/LF → "//evil.com")
 * - "/.//evil.com" (normalises to the path "//evil.com")
 * - encoded separators "%2F" / "%5C" in the path
 * Also rejects /api/* and /auth/* (no reason to land there; avoids loops).
 */
export function getSafeRedirect(
    value: string | null | undefined,
    fallback = "/",
): string {
    if (!value || value.length > 2048) return fallback;
    if (!value.startsWith("/") || value.startsWith("//")) return fallback;
    // Backslashes and control characters (incl. tab, CR, LF): never legitimate here
    if (/[\\\u0000-\u001f\u007f-\u009f]/.test(value)) return fallback;

    let url: URL;
    try {
        url = new URL(value, PARSE_BASE);
    } catch {
        return fallback;
    }

    if (url.origin !== PARSE_BASE) return fallback;
    // After normalisation ("/./", "/x/../") the path must still be a plain path
    if (url.pathname.startsWith("//") || /%2f|%5c/i.test(url.pathname)) return fallback;
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return fallback;

    // Return the normalised form, so what we checked is exactly what's used
    return url.pathname + url.search + url.hash;
}

// Reads ?redirect= from the current URL (client only, at call time).
export function getRedirectFromLocation(fallback = "/"): string {
    if (typeof window === "undefined") return fallback;
    const value = new URLSearchParams(window.location.search).get("redirect");
    return getSafeRedirect(value, fallback);
}

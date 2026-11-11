import { ROUTES } from "@/lib/constants/route";

/** Build the /search URL for a set of params ("/search" when empty). */
export function buildSearchUrl(params: URLSearchParams): string {
    const qs = params.toString();
    return qs ? `${ROUTES.SEARCH}?${qs}` : ROUTES.SEARCH;
}

/**
 * Update the /search URL without a server round-trip.
 *
 * router.push() on a page re-requests it from the server (RSC payload) on
 * every change. Native history updates are supported by the App Router and
 * keep useSearchParams() in sync, so the page stays static and only the
 * (CDN-cached) /api/anime call runs.
 *
 * - "push": filters / pagination — each is a meaningful back-button step.
 * - "replace": typing — avoids one history entry per debounced keystroke.
 */
export function setSearchUrl(
    params: URLSearchParams,
    mode: "push" | "replace" = "push",
): void {
    const url = buildSearchUrl(params);
    if (mode === "replace") {
        window.history.replaceState(null, "", url);
    } else {
        window.history.pushState(null, "", url);
    }
}

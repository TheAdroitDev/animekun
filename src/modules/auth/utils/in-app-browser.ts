/**
 * Google blocks OAuth sign-in inside apps' built-in browsers (Instagram,
 * Facebook, TikTok…): the user lands on Google's "disallowed_useragent"
 * page and never comes back. We can't see that failure, so the login page
 * warns these visitors up front. Browser-only (reads navigator.userAgent).
 */
export type InAppBrowser = "android" | "ios" | null;

// App markers in the user agent; "; wv)" = any Android WebView.
const IN_APP_MARKERS =
    /Instagram|FBAN|FBAV|FB_IAB|FBIOS|Line\/|TikTok|musical_ly|BytedanceWebview|Snapchat|LinkedInApp|MicroMessenger|; wv\)/i;

export function detectInAppBrowser(userAgent: string): InAppBrowser {
    const isAndroid = /Android/i.test(userAgent);
    const isIos = /iPhone|iPad|iPod/i.test(userAgent);
    if (!isAndroid && !isIos) return null;

    // iOS apps' web views (WKWebView) leave "Safari/" out of the user agent;
    // Safari, Chrome, Firefox and Edge on iOS all include it.
    const isIosWebView = isIos && !/Safari\//i.test(userAgent);

    if (!IN_APP_MARKERS.test(userAgent) && !isIosWebView) return null;
    return isAndroid ? "android" : "ios";
}

/** Android intent link that opens the same page in Chrome. */
export function chromeIntentUrl(href: string): string {
    const url = new URL(href);
    return `intent://${url.host}${url.pathname}${url.search}#Intent;scheme=https;package=com.android.chrome;end`;
}

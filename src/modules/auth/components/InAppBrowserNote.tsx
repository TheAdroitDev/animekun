"use client";

import { useState, useSyncExternalStore } from "react";

import {
    chromeIntentUrl,
    detectInAppBrowser,
    type InAppBrowser,
} from "@/modules/auth/utils/in-app-browser";

// Read in the browser only (the static HTML renders nothing), via
// useSyncExternalStore so there's no hydration mismatch.
const noSubscribe = () => () => {};
const readInAppBrowser = (): InAppBrowser => detectInAppBrowser(navigator.userAgent);
const serverInAppBrowser = (): InAppBrowser => null;

/**
 * Shown on the login card only inside apps' built-in browsers, where Google
 * refuses to sign anyone in. The Google button stays: if detection is wrong,
 * this is just a note.
 */
export function InAppBrowserNote() {
    const platform = useSyncExternalStore(noSubscribe, readInAppBrowser, serverInAppBrowser);
    const [copied, setCopied] = useState(false);

    if (!platform) return null;

    const handleCopy = async () => {
        const link = window.location.href;
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Some in-app browsers block the clipboard API.
            window.prompt("Copy this link and open it in your browser:", link);
        }
    };

    return (
        <div className="auth-inapp-note">
            <p className="auth-inapp-text">
                <strong>Google sign-in doesn&apos;t work inside this app.</strong>{" "}
                {platform === "android"
                    ? "Open AnimeKun in Chrome to sign in."
                    : "Tap the ••• menu and choose “Open in browser” (or Safari) to sign in."}
            </p>
            <div className="auth-inapp-actions">
                {platform === "android" && (
                    <a className="auth-inapp-btn" href={chromeIntentUrl(window.location.href)}>
                        Open in Chrome
                    </a>
                )}
                <button type="button" className="auth-inapp-btn" onClick={handleCopy}>
                    {copied ? "Link copied" : "Copy link"}
                </button>
            </div>
        </div>
    );
}

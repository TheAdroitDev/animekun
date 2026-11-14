"use client";

import { useEffect } from "react";
import { createTracwell, type EventProperties, type TracwellClient } from "tracwell";

import { useSession } from "@/lib/auth-client";

/**
 * Tracwell browser analytics (Product mode). https://tracwell.app/docs/frameworks/nextjs
 *
 * - One client per page load, created after the document exists (useEffect),
 *   never during server rendering. Production only, so local testing
 *   doesn't pollute real data.
 * - Page views are tracked by the SDK itself (it follows History API
 *   navigation, including Next.js routing). Don't add a page-view hook.
 * - Signed-in users are identified by their opaque database UUID, never by
 *   email or name. Identity is reset on sign-out (UserMenu).
 * - The project key is public by design (safe in client code).
 */

const PROJECT_KEY = "tw_live_d75399e2a9cb4d9684206762687a38f8";

let client: TracwellClient | undefined;
let identifiedUserId: string | undefined;

/**
 * The singleton client, created on first use in the browser (so an event
 * fired from an effect that runs before TracwellAnalytics's isn't lost).
 * Undefined on the server and in development. Call only from effects or
 * event handlers, never during render.
 */
export function getAnalytics() {
    if (client || typeof document === "undefined" || process.env.NODE_ENV !== "production") return client;
    client = createTracwell({
        projectKey: PROJECT_KEY,
        collectionMode: "product",
        consent: "granted",
        respectDoNotTrack: true,
    });
    return client;
}

/** Fire-and-forget event; no-op when analytics isn't running. */
export function trackEvent(name: string, properties?: EventProperties) {
    getAnalytics()?.track(name, properties);
}

/** Clears the identified user (call after sign-out). */
export function resetAnalyticsIdentity() {
    identifiedUserId = undefined;
    getAnalytics()?.reset();
}

export function TracwellAnalytics() {
    const { data: session } = useSession(); // shared with the Navbar, no extra request
    const userId = session?.user.id;

    // Start collection (initial page view + navigation) once per page load
    useEffect(() => {
        getAnalytics();
    }, []);

    // Opaque DB UUID only — never email/name
    useEffect(() => {
        const analytics = getAnalytics();
        if (!analytics || !userId || userId === identifiedUserId) return;
        identifiedUserId = userId;
        analytics.identify(userId);
    }, [userId]);

    return null;
}

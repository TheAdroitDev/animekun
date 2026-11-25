"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

/**
 * "AI Finder is here" note for /search (Phase 8 rollout). Static: no session
 * or DB read, so /search stays a CDN page. Dismissing it is remembered in
 * this browser only (localStorage). Bump the key's version to show a new
 * announcement to everyone again.
 */

const DISMISS_KEY = "animekun:ai-finder-note:v1";
const CHANGE_EVENT = "animekun:ai-finder-note";

function readDismissed(): boolean {
    try {
        return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
        return false; // storage blocked (private mode…): just show the note
    }
}

function subscribe(onChange: () => void): () => void {
    window.addEventListener("storage", onChange); // other tabs
    window.addEventListener(CHANGE_EVENT, onChange); // this tab
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
}

function dismiss(): void {
    try {
        window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
        // Can't remember it: it hides for this page view only.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface AiFinderNoteProps {
    /** The current search text; carried over so /generate opens pre-filled. */
    query?: string;
}

export function AiFinderNote({ query }: AiFinderNoteProps) {
    // The server render (and first paint) shows the note; it hides right
    // after hydration for people who dismissed it.
    const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
    if (dismissed) return null;

    const trimmed = query?.trim();
    const href = trimmed
        ? `${ROUTES.DASHBOARD.GENERATE}?q=${encodeURIComponent(trimmed)}`
        : ROUTES.DASHBOARD.GENERATE;

    return (
        <aside className="ai-note" aria-label="AI Finder">
            <Sparkles size={16} className="ai-note-icon" aria-hidden="true" />
            <p className="ai-note-text">
                <strong>New:</strong> Can&apos;t think of a title? Describe the vibe and let AI recommend anime.
                <span className="ai-note-small">Free with sign-in · 5 a day</span>
            </p>
            {/* No prefetch: /generate is protected (proxy/function per prefetch). */}
            <Link href={href} prefetch={false} className="ai-note-link">
                Try AI Finder →
            </Link>
            <button type="button" className="ai-note-close" onClick={dismiss} aria-label="Dismiss AI Finder note">
                <X size={14} aria-hidden="true" />
            </button>
        </aside>
    );
}

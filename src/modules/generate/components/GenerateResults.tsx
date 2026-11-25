"use client";

import { useEffect, useState, type CSSProperties } from "react";

import type { Recommendation } from "../types";

interface GenerateResultsProps {
    isPending: boolean;
    results: Recommendation[] | null;
    errorMessage: string | null;
}

/**
 * Loading state and results (step 8.6). No streaming: the route returns one
 * complete JSON answer, and the cards are revealed one after another.
 * Cards show title + reason only; step 8.7 adds posters, confidence and
 * links to /anime/[id].
 */
export function GenerateResults({ isPending, results, errorMessage }: GenerateResultsProps) {
    return (
        <div aria-live="polite">
            {isPending ? (
                <LoadingState />
            ) : errorMessage ? (
                <p className="gen-form-error" role="alert">
                    {errorMessage}
                </p>
            ) : results === null ? null : results.length === 0 ? (
                <p className="gen-results-empty">
                    No good matches for that. Try describing a mood, a genre or an anime you liked.
                </p>
            ) : (
                <ol className="gen-results">
                    {results.map((r, i) => (
                        // --i staggers the reveal animation (see .gen-result in globals.css).
                        <li key={r.title} className="gen-result" style={{ "--i": i } as CSSProperties}>
                            <span className="gen-result-title">{r.title}</span>
                            <span className="gen-result-reason">{r.reason}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

const LOADING_MESSAGES = [
    "Reading your vibe…",
    "Searching the archives…",
    "Comparing plots and moods…",
    "Picking the best matches…",
];

const MESSAGE_INTERVAL_MS = 1500;
const SKELETON_COUNT = 3;

/** Skeleton cards + a status line that changes every 1.5s (stops on the last one). */
function LoadingState() {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setStep((s) => Math.min(s + 1, LOADING_MESSAGES.length - 1));
        }, MESSAGE_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="gen-loading">
            <p className="gen-loading-message">{LOADING_MESSAGES[step]}</p>
            <ol className="gen-results" aria-hidden="true">
                {Array.from({ length: SKELETON_COUNT }, (_, i) => (
                    <li key={i} className="gen-result gen-result--skeleton">
                        <span className="detail-skeleton" style={{ width: "45%", height: 16 }} />
                        <span className="detail-skeleton" style={{ width: "95%", height: 12 }} />
                        <span className="detail-skeleton" style={{ width: "70%", height: 12 }} />
                    </li>
                ))}
            </ol>
        </div>
    );
}

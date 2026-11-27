"use client";

import { useEffect, useState } from "react";

import { signalFeedbackMoment } from "@/components/feedback";

import type { ResolvedRecommendation } from "../types";
import { ResultCard } from "./ResultCard";

interface GenerateResultsProps {
    isPending: boolean;
    results: ResolvedRecommendation[] | null;
    errorMessage: string | null;
}

/**
 * Loading state and results (step 8.6). No streaming: the route returns one
 * complete JSON answer, and the cards (ResultCard, 8.7) are revealed one
 * after another.
 */
export function GenerateResults({ isPending, results, errorMessage }: GenerateResultsProps) {
    // Fresh results are a good moment to ask for feedback (the card waits a
    // few seconds and shows at most once per visit; see FeedbackPrompt).
    const hasResults = !isPending && !errorMessage && (results?.length ?? 0) > 0;
    useEffect(() => {
        if (hasResults) signalFeedbackMoment();
    }, [hasResults, results]);

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
                        <ResultCard key={r.anime?.id ?? r.title} recommendation={r} index={i} />
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
                    <li key={i} className="gen-result gen-card gen-result--skeleton">
                        <span className="gen-card-poster detail-skeleton" />
                        <span className="gen-card-body">
                            <span className="detail-skeleton" style={{ width: "45%", height: 16 }} />
                            <span className="detail-skeleton" style={{ width: "25%", height: 12 }} />
                            <span className="detail-skeleton" style={{ width: "95%", height: 12 }} />
                            <span className="detail-skeleton" style={{ width: "70%", height: 12 }} />
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

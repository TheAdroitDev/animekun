"use client";

import { openFeedback } from "./feedback-store";

/** Footer entry point: opens the 目安箱 card on demand, on any page. */
export function FeedbackLink({ className }: { className?: string }) {
    return (
        <button type="button" className={className} onClick={openFeedback}>
            Send feedback
        </button>
    );
}

"use client";

import { useState } from "react";

// Character threshold — synopsis longer than this gets a "Read More" toggle 
const SYNOPSIS_CLAMP = 300;

interface InfoItem {
    label: string;
    value: string;
}

interface AnimeSynopsisProps {
    synopsis: string | null;
    infoItems: InfoItem[];
}

export function AnimeSynopsis({ synopsis, infoItems }: AnimeSynopsisProps) {
    const [expanded, setExpanded] = useState(false);

    const isLong = (synopsis?.length ?? 0) > SYNOPSIS_CLAMP;
    const displayText =
        synopsis && isLong && !expanded
            ? synopsis.slice(0, SYNOPSIS_CLAMP).trimEnd() + "…"
            : synopsis;

    return (
        <>
            {/* ── Synopsis ── */}
            {synopsis && (
                <div className="detail-block">
                    <h2 className="detail-block-heading">Synopsis</h2>
                    <p className="detail-synopsis">{displayText}</p>
                    {isLong && (
                        <button
                            type="button"
                            className="detail-read-more"
                            onClick={() => setExpanded((prev) => !prev)}
                        >
                            {expanded ? "Show Less" : "Read More"}
                        </button>
                    )}
                </div>
            )}

            {/* ── Info Grid ── */}
            {infoItems.length > 0 && (
                <div className="detail-block">
                    <h2 className="detail-block-heading">Information</h2>
                    <div className="detail-info-grid">
                        {infoItems.map((item) => (
                            <div key={item.label} className="detail-info-cell">
                                <span className="detail-info-cell-label">{item.label}</span>
                                <span className="detail-info-cell-value">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

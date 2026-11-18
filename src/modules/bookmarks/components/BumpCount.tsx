"use client";

import { useState } from "react";

interface BumpCountProps {
    value: number;
    className: string;
    "aria-label"?: string;
}

/**
 * A number that does a quick "bump" (CSS .is-bump) whenever it changes,
 * but not on first render. Changing the key remounts the span, which
 * replays the CSS animation.
 */
export function BumpCount({ value, className, "aria-label": ariaLabel }: BumpCountProps) {
    // Adjusting state during render (React's recommended pattern, no effect).
    const [prev, setPrev] = useState(value);
    const [bumps, setBumps] = useState(0);
    if (value !== prev) {
        setPrev(value);
        setBumps((n) => n + 1);
    }

    return (
        <span key={bumps} className={bumps > 0 ? `${className} is-bump` : className} aria-label={ariaLabel}>
            {value}
        </span>
    );
}

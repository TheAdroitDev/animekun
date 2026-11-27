"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 250;
const URGENT_SECONDS = 5;

interface QuizTimerProps {
    seconds: number;
    /** Stops the countdown (while the answer is checked or shown). */
    paused: boolean;
    /** Called once when time runs out: the game sends "no answer". */
    onExpire: () => void;
}

/**
 * Countdown for one question (9.6). Mount it with a new `key` per question
 * so it restarts. The bar is a CSS animation; the number ticks in JS. The
 * browser timer is only a guide: the server checks the real time limit.
 */
export function QuizTimer({ seconds, paused, onExpire }: QuizTimerProps) {
    const [remainingMs, setRemainingMs] = useState(seconds * 1000);
    const remainingRef = useRef(seconds * 1000);
    const onExpireRef = useRef(onExpire);
    const expiredRef = useRef(false);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        if (paused || expiredRef.current) return;

        // Count from the moment it (re)started, so pauses don't drift.
        const startedAt = performance.now();
        const startRemaining = remainingRef.current;

        const id = window.setInterval(() => {
            const left = Math.max(startRemaining - (performance.now() - startedAt), 0);
            remainingRef.current = left;
            setRemainingMs(left);
            if (left === 0 && !expiredRef.current) {
                expiredRef.current = true;
                window.clearInterval(id);
                onExpireRef.current();
            }
        }, TICK_MS);

        return () => window.clearInterval(id);
    }, [paused]);

    const secondsLeft = Math.ceil(remainingMs / 1000);
    const urgent = secondsLeft <= URGENT_SECONDS;

    return (
        <div
            className={`quiz-timer${urgent ? " quiz-timer--urgent" : ""}${paused ? " quiz-timer--paused" : ""}`}
            style={{ "--quiz-time": `${seconds}s` } as React.CSSProperties}
        >
            <div className="quiz-timer-track" aria-hidden="true">
                <div className="quiz-timer-bar" />
            </div>
            <span className="quiz-timer-count" aria-label={`${secondsLeft} seconds left`}>
                {secondsLeft}s
            </span>
        </div>
    );
}

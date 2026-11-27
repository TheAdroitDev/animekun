"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

import {
    FEEDBACK_MOMENT_EVENT,
    FEEDBACK_OPEN_EVENT,
    VIEWS_BEFORE_PROMPT,
    canAutoPrompt,
    countPageView,
    markShown,
} from "./feedback-store";

// The card and the confetti load only when needed, so they cost nothing on
// a normal page load.
const FeedbackCard = dynamic(() => import("./FeedbackCard").then((m) => m.FeedbackCard), {
    ssr: false,
});
const Confetti = dynamic(() => import("@/components/effects/Confetti").then((m) => m.Confetti), {
    ssr: false,
});

/** Wait a moment after a trigger, so the card never interrupts. */
const AUTO_DELAY_MS = 3000;
/** Matches CONFETTI_MS in effects/Confetti (kept here to avoid loading it). */
const CONFETTI_MS = 4500;

type OpenMode = "auto" | "manual";

/**
 * Mounted once in the root layout. Decides when the suggestion-box card
 * shows: after a "good moment" event (AI results), on the 3rd page of a
 * visit, or when the user clicks "Send feedback" in the footer.
 */
export function FeedbackPrompt() {
    const pathname = usePathname();
    const [mode, setMode] = useState<OpenMode | null>(null);
    const [celebrating, setCelebrating] = useState(false);
    const timer = useRef<number | null>(null);
    const pathRef = useRef(pathname);

    const scheduleAuto = useCallback(() => {
        if (timer.current !== null) return;
        timer.current = window.setTimeout(() => {
            timer.current = null;
            if (!canAutoPrompt(pathRef.current)) return;
            markShown();
            setMode((m) => m ?? "auto");
        }, AUTO_DELAY_MS);
    }, []);

    // Count page views; the 3rd one in a visit is a moment too.
    useEffect(() => {
        pathRef.current = pathname;
        if (countPageView() === VIEWS_BEFORE_PROMPT) scheduleAuto();
    }, [pathname, scheduleAuto]);

    useEffect(() => {
        const onMoment = () => scheduleAuto();
        const onOpen = () => setMode("manual");
        window.addEventListener(FEEDBACK_MOMENT_EVENT, onMoment);
        window.addEventListener(FEEDBACK_OPEN_EVENT, onOpen);
        return () => {
            window.removeEventListener(FEEDBACK_MOMENT_EVENT, onMoment);
            window.removeEventListener(FEEDBACK_OPEN_EVENT, onOpen);
            if (timer.current !== null) window.clearTimeout(timer.current);
        };
    }, [scheduleAuto]);

    useEffect(() => {
        if (!celebrating) return;
        const id = window.setTimeout(() => setCelebrating(false), CONFETTI_MS);
        return () => window.clearTimeout(id);
    }, [celebrating]);

    const handleClose = useCallback(() => setMode(null), []);
    const handleSent = useCallback(() => setCelebrating(true), []);

    return (
        <>
            {mode && <FeedbackCard autoOpened={mode === "auto"} onClose={handleClose} onSent={handleSent} />}
            {celebrating && <Confetti />}
        </>
    );
}

"use client";

import { Lightbulb, SkipForward } from "lucide-react";

import { LIFELINES } from "../constants";
import type { Lifeline } from "../types";

const LIFELINE_INFO: Record<Lifeline, { label: string; title: string }> = {
    fifty: { label: "50/50", title: "Remove 2 wrong answers" },
    hint: { label: "Hint", title: "Show the genres and year" },
    skip: { label: "Skip", title: "Skip this question: no points, streak kept" },
};

interface QuizLifelinesProps {
    used: Lifeline[];
    /** A lifeline request is on its way. */
    pending: Lifeline | null;
    /** Only while the question is open. */
    enabled: boolean;
    onUse: (lifeline: Lifeline) => void;
}

/** 50/50, Hint and Skip (9.7): each once per game; used ones stay crossed out. */
export function QuizLifelines({ used, pending, enabled, onUse }: QuizLifelinesProps) {
    return (
        <div className="quiz-lifelines" role="group" aria-label="Lifelines (once per game)">
            {LIFELINES.map((lifeline) => {
                const info = LIFELINE_INFO[lifeline];
                const isUsed = used.includes(lifeline);
                return (
                    <button
                        key={lifeline}
                        type="button"
                        className={`quiz-lifeline${isUsed ? " quiz-lifeline--used" : ""}`}
                        title={isUsed ? `${info.label} already used` : info.title}
                        aria-label={isUsed ? `${info.label} (used)` : `${info.label}: ${info.title}`}
                        onClick={() => onUse(lifeline)}
                        disabled={!enabled || isUsed || pending !== null}
                        aria-busy={pending === lifeline}
                    >
                        {lifeline === "hint" && <Lightbulb size={14} aria-hidden="true" />}
                        {lifeline === "skip" && <SkipForward size={14} aria-hidden="true" />}
                        <span>{info.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

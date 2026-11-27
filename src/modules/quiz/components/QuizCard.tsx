"use client";

import { useEffect } from "react";
import { ArrowRight, Flame, X } from "lucide-react";

import { TITLE_MASK } from "../constants";
import type { AnswerResult, QuizQuestion } from "../types";
import { QuizTimer } from "./QuizTimer";

export type CardStatus = "playing" | "checking" | "revealed";

interface QuizCardProps {
    question: QuizQuestion;
    total: number;
    /** Score and streak before this answer. */
    score: number;
    streak: number;
    status: CardStatus;
    selectedId: string | null;
    result: AnswerResult | null;
    error: string | null;
    /** null = time ran out. */
    onAnswer: (optionId: string | null) => void;
    onNext: () => void;
    onQuit: () => void;
}

const LETTERS = ["A", "B", "C", "D"];

/**
 * One question (9.5): masked synopsis or a poster that slowly unblurs,
 * 4 options (click or keys 1–4), then the reveal: the right option turns
 * green, a wrong pick red. Mount with a new `key` per question.
 */
export function QuizCard({
    question,
    total,
    score,
    streak,
    status,
    selectedId,
    result,
    error,
    onAnswer,
    onNext,
    onQuit,
}: QuizCardProps) {
    const isPlaying = status === "playing";
    const isRevealed = status === "revealed" && result !== null;
    const isLast = isRevealed && result.next === null;

    // Keys 1–4 pick an answer while the question is open.
    useEffect(() => {
        if (!isPlaying) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey || event.altKey) return;
            const option = question.options[Number(event.key) - 1];
            if (option) onAnswer(option.id);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isPlaying, question.options, onAnswer]);

    const correctTitle = isRevealed
        ? question.options.find((o) => o.id === result.correctId)?.title
        : undefined;

    return (
        <section className="quiz-play-card quiz-card" aria-label={`Question ${question.index + 1} of ${total}`}>
            <div className="quiz-card-top">
                <span className="quiz-card-progress">
                    Question {question.index + 1} of {total}
                </span>
                <span className="quiz-card-score">{isRevealed ? result.score : score} pts</span>
                {(isRevealed ? result.streak : streak) > 1 && (
                    <span className="quiz-card-streak">
                        <Flame size={14} aria-hidden="true" />
                        {isRevealed ? result.streak : streak}
                    </span>
                )}
                <button type="button" className="quiz-card-quit" onClick={onQuit} aria-label="Quit quiz">
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <QuizTimer
                seconds={question.timeLimitSeconds}
                paused={!isPlaying}
                onExpire={() => onAnswer(null)}
            />

            {question.mode === "synopsis" ? (
                <p className="quiz-card-synopsis">
                    {question.prompt.split(TITLE_MASK).map((part, i) => (
                        <span key={i}>
                            {i > 0 && (
                                <span className="quiz-card-mask" title="Title hidden">
                                    <span className="sr-only">title hidden</span>
                                </span>
                            )}
                            {part}
                        </span>
                    ))}
                </p>
            ) : (
                <div className="quiz-card-poster-frame">
                    {/* eslint-disable-next-line @next/next/no-img-element -- MAL CDN poster, never through /_next/image */}
                    <img
                        className={`quiz-card-poster${isRevealed ? " quiz-card-poster--revealed" : ""}${isPlaying ? "" : " quiz-card-poster--paused"}`}
                        style={{ "--quiz-time": `${question.timeLimitSeconds}s` } as React.CSSProperties}
                        src={question.prompt}
                        alt={isRevealed ? `Poster of ${correctTitle}` : "Blurred poster of the anime to guess"}
                    />
                </div>
            )}

            <div className="quiz-card-options" role="group" aria-label="Answers">
                {question.options.map((option, i) => {
                    let state = "";
                    if (isRevealed) {
                        if (option.id === result.correctId) state = " quiz-card-option--correct";
                        else if (option.id === selectedId) state = " quiz-card-option--wrong";
                        else state = " quiz-card-option--dim";
                    } else if (option.id === selectedId) {
                        state = " quiz-card-option--selected";
                    }
                    return (
                        <button
                            key={option.id}
                            type="button"
                            className={`quiz-card-option${state}`}
                            onClick={() => onAnswer(option.id)}
                            disabled={!isPlaying}
                        >
                            <span className="quiz-card-letter" aria-hidden="true">
                                {LETTERS[i]}
                            </span>
                            <span className="quiz-card-option-title">{option.title}</span>
                        </button>
                    );
                })}
            </div>

            <div className="quiz-card-feedback" aria-live="polite">
                {isRevealed && (
                    <>
                        <p className={`quiz-card-verdict${result.correct ? " quiz-card-verdict--correct" : ""}`}>
                            {result.correct ? (
                                <>Correct! +{result.score - score}</>
                            ) : (
                                <>
                                    {result.timedOut ? "Time's up" : "Not quite"}: it was{" "}
                                    <strong>{correctTitle}</strong>
                                </>
                            )}
                        </p>
                        <button type="button" className="quiz-play-start quiz-card-next" onClick={onNext}>
                            <span>{isLast ? "See results" : "Next"}</span>
                            <ArrowRight size={16} aria-hidden="true" />
                        </button>
                    </>
                )}
                {error && (
                    <p className="quiz-play-error" role="alert">
                        {error}
                    </p>
                )}
            </div>
        </section>
    );
}

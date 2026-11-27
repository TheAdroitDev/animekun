"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock, Flame, Loader2, RotateCcw, Settings2, SkipForward, X } from "lucide-react";

import { Confetti, CONFETTI_MS } from "@/components/effects/Confetti";
import { ROUTES } from "@/lib/constants/route";

import type { Difficulty, QuizMode, QuizResults as Results, QuizReviewItem } from "../types";

const CONFETTI_MIN_CORRECT = 8;

const MODE_LABEL: Record<QuizMode, string> = { synopsis: "Synopsis", poster: "Poster" };
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

interface QuizResultsProps {
    results: Results;
    history: QuizReviewItem[];
    mode: QuizMode;
    difficulty: Difficulty;
    remaining: number;
    dailyLimit: number;
    isStarting: boolean;
    onPlayAgain: () => void;
    onChangeMode: () => void;
}

/**
 * End of a game (9.8). The score is already saved on the server (the last
 * answer closed the game), so this only shows it: headline, stats, a review
 * of every question with a link to the anime, and Play again with the same
 * settings. Confetti once for 8+ correct.
 */
export function QuizResults({
    results,
    history,
    mode,
    difficulty,
    remaining,
    dailyLimit,
    isStarting,
    onPlayAgain,
    onChangeMode,
}: QuizResultsProps) {
    const [celebrating, setCelebrating] = useState(results.correctCount >= CONFETTI_MIN_CORRECT);

    useEffect(() => {
        if (!celebrating) return;
        const id = window.setTimeout(() => setCelebrating(false), CONFETTI_MS);
        return () => window.clearTimeout(id);
    }, [celebrating]);

    const skipped = history.filter((h) => h.skipped).length;
    const timedOut = history.filter((h) => !h.skipped && h.timedOut).length;
    const wrong = history.filter((h) => !h.correct && !h.skipped && !h.timedOut).length;
    const outOfGames = remaining <= 0;

    return (
        <section className="quiz-play-card quiz-results" aria-labelledby="quiz-results-title">
            {celebrating && <Confetti />}

            <div className="quiz-results-head">
                <h2 id="quiz-results-title" className="quiz-results-title">
                    {headline(results.correctCount, results.total)}
                </h2>
                <p className="quiz-results-score">{results.score.toLocaleString("en-US")} pts</p>
                <p className="quiz-results-meta">
                    {MODE_LABEL[mode]} · {DIFFICULTY_LABEL[difficulty]}
                </p>
            </div>

            <dl className="quiz-results-stats">
                <Stat label="Correct" value={`${results.correctCount}/${results.total}`} />
                <Stat label="Wrong" value={wrong} />
                <Stat label="Skipped" value={skipped} />
                <Stat label="Time's up" value={timedOut} />
                <Stat
                    label="Best streak"
                    value={
                        <>
                            <Flame size={14} aria-hidden="true" /> {results.bestStreak}
                        </>
                    }
                />
                <Stat label="Time" value={formatDuration(results.durationMs)} />
            </dl>

            <div className="quiz-results-actions">
                <button
                    type="button"
                    className="quiz-play-start quiz-results-again"
                    onClick={onPlayAgain}
                    disabled={isStarting || outOfGames}
                >
                    {isStarting ? (
                        <Loader2 size={16} className="quiz-play-spinner" aria-hidden="true" />
                    ) : (
                        <RotateCcw size={16} aria-hidden="true" />
                    )}
                    <span>Play again</span>
                </button>
                <button type="button" className="quiz-results-secondary" onClick={onChangeMode}>
                    <Settings2 size={16} aria-hidden="true" />
                    <span>Change mode</span>
                </button>
                <span className={`quiz-play-remaining${outOfGames ? " quiz-play-remaining--empty" : ""}`}>
                    {outOfGames
                        ? "No quizzes left today · resets at 00:00 UTC"
                        : `${remaining} of ${dailyLimit} quizzes left today`}
                </span>
            </div>

            <ol className="quiz-review" aria-label="Your answers">
                {history.map((item) => {
                    const answer = item.question.options.find((o) => o.id === item.correctId);
                    const picked = item.question.options.find((o) => o.id === item.selectedId);
                    const outcome = item.correct
                        ? "correct"
                        : item.skipped
                          ? "skipped"
                          : item.timedOut
                            ? "timeout"
                            : "wrong";
                    return (
                        <li key={item.question.index} className={`quiz-review-row quiz-review-row--${outcome}`}>
                            <span className="quiz-review-icon" aria-label={OUTCOME_LABEL[outcome]}>
                                {outcome === "correct" && <Check size={14} aria-hidden="true" />}
                                {outcome === "wrong" && <X size={14} aria-hidden="true" />}
                                {outcome === "skipped" && <SkipForward size={14} aria-hidden="true" />}
                                {outcome === "timeout" && <Clock size={14} aria-hidden="true" />}
                            </span>
                            {item.question.mode === "poster" && (
                                // eslint-disable-next-line @next/next/no-img-element -- MAL CDN poster, never through /_next/image
                                <img className="quiz-review-poster" src={item.question.prompt} alt="" loading="lazy" />
                            )}
                            <span className="quiz-review-text">
                                {answer ? (
                                    <Link
                                        href={ROUTES.ANIME_DETAIL(item.correctId)}
                                        prefetch={false}
                                        className="quiz-review-title"
                                    >
                                        {answer.title}
                                    </Link>
                                ) : (
                                    <span className="quiz-review-title">Unknown anime</span>
                                )}
                                {outcome === "wrong" && picked && (
                                    <span className="quiz-review-picked">You said: {picked.title}</span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

const OUTCOME_LABEL = {
    correct: "Correct",
    wrong: "Wrong",
    skipped: "Skipped",
    timeout: "Time's up",
} as const;

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="quiz-results-stat">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function headline(correct: number, total: number): string {
    if (correct === total) return "Flawless! 🏆";
    if (correct >= 7) return "Great run!";
    if (correct >= 4) return "Not bad!";
    return "Time for a rewatch 😅";
}

/** 72000 → "1m 12s", 45000 → "45s". */
function formatDuration(ms: number): string {
    const seconds = Math.max(Math.round(ms / 1000), 0);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

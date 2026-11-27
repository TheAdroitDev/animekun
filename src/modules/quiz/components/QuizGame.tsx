"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { BookOpen, Image as ImageIcon, Loader2, Play, RotateCcw } from "lucide-react";

import {
    DIFFICULTIES,
    POINTS_PER_CORRECT,
    QUIZ_MODES,
    REVEAL_SECONDS,
    TIME_LIMIT_SECONDS,
} from "../constants";
import { answerQuizRequest, lifelineRequest, QuizApiError, startQuizRequest } from "../queries/quiz-api";
import type {
    AnswerResult,
    Difficulty,
    Lifeline,
    LifelineResult,
    QuizMode,
    QuizQuestion,
    QuizResults,
    StartQuizResult,
} from "../types";
import { QuizCard } from "./QuizCard";

const MODE_INFO: Record<QuizMode, { label: string; description: string; icon: typeof BookOpen }> = {
    synopsis: { label: "Synopsis", description: "Read the plot, name the anime.", icon: BookOpen },
    poster: { label: "Poster", description: "Name it from a blurred poster.", icon: ImageIcon },
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
};

// ── Game flow (state machine) ──
// idle → starting → playing → checking → revealed → playing … → finished
// The server holds the answers and the clock; this only mirrors it.

interface Round {
    sessionId: string;
    total: number;
    question: QuizQuestion;
    score: number;
    streak: number;
    /** Lifelines used this game, and this question's 50/50 and hint (9.7). */
    lifelinesUsed: Lifeline[];
    removedIds: string[];
    hint: string | null;
}

type GameState =
    | { phase: "idle"; error: string | null }
    | { phase: "starting" }
    | ({ phase: "playing"; error: string | null } & Round)
    | ({ phase: "checking"; selectedId: string | null } & Round)
    | ({ phase: "revealed"; selectedId: string | null; result: AnswerResult } & Round)
    | { phase: "finished"; results: QuizResults };

type GameAction =
    | { type: "start" }
    | { type: "started"; game: StartQuizResult }
    | { type: "answer"; optionId: string | null }
    | { type: "answered"; result: AnswerResult }
    | { type: "answerFailed"; message: string }
    | { type: "lifelineUsed"; index: number; result: LifelineResult }
    | { type: "lifelineFailed"; index: number; message: string }
    | { type: "next" }
    | { type: "exit"; error: string | null };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case "start":
            return state.phase === "idle" ? { phase: "starting" } : state;
        case "started":
            if (state.phase !== "starting") return state;
            return {
                phase: "playing",
                error: null,
                sessionId: action.game.sessionId,
                total: action.game.total,
                question: action.game.question,
                score: 0,
                streak: 0,
                lifelinesUsed: [],
                removedIds: [],
                hint: null,
            };
        case "answer":
            if (state.phase !== "playing") return state; // one answer per question
            return { ...roundOf(state), phase: "checking", selectedId: action.optionId };
        case "answered":
            if (state.phase !== "checking") return state;
            return {
                ...state,
                phase: "revealed",
                result: action.result,
                lifelinesUsed: action.result.skipped
                    ? [...state.lifelinesUsed, "skip"]
                    : state.lifelinesUsed,
            };
        case "answerFailed":
            if (state.phase !== "checking") return state;
            return { ...roundOf(state), phase: "playing", error: action.message };
        case "lifelineUsed": {
            // Ignore a late reply for a question that's already answered.
            if (state.phase !== "playing" || state.question.index !== action.index) return state;
            const { result } = action;
            return {
                ...state,
                error: null,
                lifelinesUsed: [...state.lifelinesUsed, result.type],
                removedIds: result.type === "fifty" ? result.removedIds : state.removedIds,
                hint: result.type === "hint" ? result.hint : state.hint,
            };
        }
        case "lifelineFailed":
            if (state.phase !== "playing" || state.question.index !== action.index) return state;
            return { ...state, error: action.message };
        case "next": {
            if (state.phase !== "revealed") return state;
            const { result } = state;
            if (!result.next) {
                return result.results ? { phase: "finished", results: result.results } : state;
            }
            return {
                ...roundOf(state),
                phase: "playing",
                error: null,
                question: result.next,
                score: result.score,
                streak: result.streak,
                removedIds: [],
                hint: null,
            };
        }
        case "exit":
            return { phase: "idle", error: action.error };
    }
}

function roundOf(state: Round): Round {
    const { sessionId, total, question, score, streak, lifelinesUsed, removedIds, hint } = state;
    return { sessionId, total, question, score, streak, lifelinesUsed, removedIds, hint };
}

interface QuizGameProps {
    initialRemaining: number;
    dailyLimit: number;
}

export function QuizGame({ initialRemaining, dailyLimit }: QuizGameProps) {
    const [state, dispatch] = useReducer(gameReducer, { phase: "idle", error: null });
    const [mode, setMode] = useState<QuizMode>("synopsis");
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [remaining, setRemaining] = useState(initialRemaining);

    const handleStart = async () => {
        if (state.phase !== "idle" || remaining <= 0) return;
        dispatch({ type: "start" });
        try {
            const game = await startQuizRequest(mode, difficulty);
            setRemaining((r) => Math.max(r - 1, 0));
            dispatch({ type: "started", game });
        } catch (error) {
            if (error instanceof QuizApiError && error.status === 429) setRemaining(0);
            dispatch({ type: "exit", error: errorMessage(error) });
        }
    };

    const sessionId = state.phase === "playing" ? state.sessionId : null;
    const questionIndex = state.phase === "playing" ? state.question.index : null;

    const handleAnswer = useCallback(
        async (optionId: string | null, skip = false) => {
            if (sessionId === null || questionIndex === null) return;
            dispatch({ type: "answer", optionId });
            try {
                const result = await answerQuizRequest(sessionId, questionIndex, optionId, skip);
                dispatch({ type: "answered", result });
            } catch (error) {
                if (error instanceof QuizApiError && error.status === 409) {
                    // Already answered (e.g. the reply got lost) or the game ended.
                    dispatch({ type: "exit", error: "This game has ended. Start a new one." });
                    return;
                }
                dispatch({
                    type: "answerFailed",
                    message: "Couldn't send your answer. Pick again.",
                });
            }
        },
        [sessionId, questionIndex],
    );

    const [lifelinePending, setLifelinePending] = useState<Lifeline | null>(null);

    // Skip is an answer (no points, streak kept); 50/50 and Hint ask the
    // server for this question's data. The timer keeps running meanwhile.
    const handleLifeline = async (lifeline: Lifeline) => {
        if (sessionId === null || questionIndex === null || lifelinePending) return;
        if (lifeline === "skip") {
            void handleAnswer(null, true);
            return;
        }
        setLifelinePending(lifeline);
        try {
            const result = await lifelineRequest(sessionId, questionIndex, lifeline);
            dispatch({ type: "lifelineUsed", index: questionIndex, result });
        } catch (error) {
            dispatch({ type: "lifelineFailed", index: questionIndex, message: errorMessage(error) });
        } finally {
            setLifelinePending(null);
        }
    };

    // After the reveal, move on by itself: the server starts the next
    // question's clock REVEAL_SECONDS after the answer. "Next" skips ahead.
    const autoAdvance = state.phase === "revealed" && state.result.next !== null;
    useEffect(() => {
        if (!autoAdvance) return;
        const id = window.setTimeout(() => dispatch({ type: "next" }), REVEAL_SECONDS * 1000);
        return () => window.clearTimeout(id);
    }, [autoAdvance]);

    if (state.phase === "playing" || state.phase === "checking" || state.phase === "revealed") {
        return (
            <QuizCard
                key={state.question.index}
                question={state.question}
                total={state.total}
                score={state.score}
                streak={state.streak}
                status={state.phase}
                selectedId={state.phase === "playing" ? null : state.selectedId}
                result={state.phase === "revealed" ? state.result : null}
                error={state.phase === "playing" ? state.error : null}
                lifelinesUsed={state.lifelinesUsed}
                lifelinePending={lifelinePending}
                removedIds={state.removedIds}
                hint={state.hint}
                onAnswer={handleAnswer}
                onLifeline={handleLifeline}
                onNext={() => dispatch({ type: "next" })}
                onQuit={() => dispatch({ type: "exit", error: null })}
            />
        );
    }

    if (state.phase === "finished") {
        // Minimal end screen; the full results screen is step 9.8.
        const { results } = state;
        return (
            <section className="quiz-play-card quiz-results" aria-live="polite">
                <p className="quiz-results-score">{results.score} pts</p>
                <p className="quiz-results-line">
                    {results.correctCount} of {results.total} correct · best streak {results.bestStreak} ·{" "}
                    {Math.round(results.durationMs / 1000)}s
                </p>
                <button
                    type="button"
                    className="quiz-play-start quiz-results-again"
                    onClick={() => dispatch({ type: "exit", error: null })}
                >
                    <RotateCcw size={16} aria-hidden="true" />
                    <span>Play again</span>
                </button>
            </section>
        );
    }

    const isStarting = state.phase === "starting";
    const outOfGames = remaining <= 0;
    const error = state.phase === "idle" ? state.error : null;

    return (
        <section className="quiz-play-card">
            <fieldset className="quiz-play-fieldset" disabled={isStarting}>
                <legend className="quiz-play-legend">Mode</legend>
                <div className="quiz-play-modes">
                    {QUIZ_MODES.map((m) => {
                        const info = MODE_INFO[m];
                        const Icon = info.icon;
                        return (
                            <label key={m} className="quiz-play-mode">
                                <input
                                    type="radio"
                                    name="quiz-mode"
                                    value={m}
                                    checked={mode === m}
                                    onChange={() => setMode(m)}
                                    className="quiz-play-radio"
                                />
                                <Icon size={20} aria-hidden="true" className="quiz-play-mode-icon" />
                                <span className="quiz-play-mode-label">{info.label}</span>
                                <span className="quiz-play-mode-desc">{info.description}</span>
                            </label>
                        );
                    })}
                </div>
            </fieldset>

            <fieldset className="quiz-play-fieldset" disabled={isStarting}>
                <legend className="quiz-play-legend">Difficulty</legend>
                <div className="quiz-play-levels">
                    {DIFFICULTIES.map((d) => (
                        <label key={d} className="quiz-play-level">
                            <input
                                type="radio"
                                name="quiz-difficulty"
                                value={d}
                                checked={difficulty === d}
                                onChange={() => setDifficulty(d)}
                                className="quiz-play-radio"
                            />
                            <span className="quiz-play-level-label">{DIFFICULTY_LABEL[d]}</span>
                            <span className="quiz-play-level-meta">
                                {TIME_LIMIT_SECONDS[d]}s · {POINTS_PER_CORRECT[d]} pts
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            <div className="quiz-play-footer">
                <span className={`quiz-play-remaining${outOfGames ? " quiz-play-remaining--empty" : ""}`}>
                    {outOfGames
                        ? "No quizzes left today · resets at 00:00 UTC"
                        : `${remaining} of ${dailyLimit} quizzes left today`}
                </span>
                <button
                    type="button"
                    className="quiz-play-start"
                    onClick={handleStart}
                    disabled={isStarting || outOfGames}
                >
                    {isStarting ? (
                        <Loader2 size={16} className="quiz-play-spinner" aria-hidden="true" />
                    ) : (
                        <Play size={16} aria-hidden="true" />
                    )}
                    <span>{isStarting ? "Starting…" : "Start quiz"}</span>
                </button>
            </div>

            {error && (
                <p className="quiz-play-error" role="alert">
                    {error}
                </p>
            )}
        </section>
    );
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

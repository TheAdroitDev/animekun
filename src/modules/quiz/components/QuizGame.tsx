"use client";

import { useReducer, useState } from "react";
import { BookOpen, Image as ImageIcon, Loader2, Play } from "lucide-react";

import { DIFFICULTIES, POINTS_PER_CORRECT, QUIZ_MODES, TIME_LIMIT_SECONDS } from "../constants";
import { QuizApiError, startQuizRequest } from "../queries/quiz-api";
import type { Difficulty, QuizMode, QuizQuestion, StartQuizResult } from "../types";

const MODE_INFO: Record<QuizMode, { label: string; description: string; icon: typeof BookOpen }> = {
    synopsis: { label: "Synopsis", description: "Read the plot, name the anime.", icon: BookOpen },
    poster: { label: "Poster", description: "Name it from a blurred poster.", icon: ImageIcon },
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
};

// ── Game flow (state machine): idle → starting → playing → results ──
// 9.4 builds idle/starting; the question card (9.5) and results (9.8)
// fill in playing and results.

type GameState =
    | { phase: "idle"; error: string | null }
    | { phase: "starting" }
    | { phase: "playing"; sessionId: string; total: number; question: QuizQuestion };

type GameAction =
    | { type: "start" }
    | { type: "started"; game: StartQuizResult }
    | { type: "failed"; message: string };

function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
        case "start":
            return state.phase === "idle" ? { phase: "starting" } : state;
        case "started":
            return state.phase === "starting"
                ? {
                      phase: "playing",
                      sessionId: action.game.sessionId,
                      total: action.game.total,
                      question: action.game.question,
                  }
                : state;
        case "failed":
            return { phase: "idle", error: action.message };
    }
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
            dispatch({
                type: "failed",
                message: error instanceof Error ? error.message : "Something went wrong. Please try again.",
            });
        }
    };

    if (state.phase === "playing") {
        // Placeholder until the question card (9.5).
        const { question, total } = state;
        return (
            <section className="quiz-play-card" aria-live="polite">
                <p className="quiz-play-progress">
                    Question {question.index + 1} of {total}
                </p>
                {question.mode === "synopsis" ? (
                    <p className="quiz-play-synopsis">{question.prompt}</p>
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- MAL CDN poster, never through /_next/image
                    <img className="quiz-play-poster" src={question.prompt} alt="Poster of the anime to guess" />
                )}
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

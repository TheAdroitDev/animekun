"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    Quiz01Icon,
    Award01Icon,
    ArrowRight01Icon,
    CheckmarkCircle02Icon,
    CancelCircleIcon,
    FireIcon,
    HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { ROUTES } from "@/lib/constants/route";

interface QuestionOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

const QUESTION_DATA = {
    question: "Which Titan power did Eren Jaeger inherit first from his father Grisha?",
    anime: "Attack on Titan",
    difficulty: "Medium",
    options: [
        { id: "A", text: "Colossal Titan", isCorrect: false },
        { id: "B", text: "Attack Titan", isCorrect: true },
        { id: "C", text: "Armored Titan", isCorrect: false },
        { id: "D", text: "Beast Titan", isCorrect: false },
    ] as QuestionOption[],
    explanation: "Grisha Jaeger possessed both the Attack Titan and the Founding Titan, and injected Eren with titan serum to pass them on.",
};

const QUIZ_TIERS = [
    {
        title: "Rookie Weeb",
        badge: "Tier 1",
        description: "Test your knowledge on Shounen staples, the Big 3, and mainstream classics.",
        meta: "15 Questions • 2 Lifelines",
        accentColor: "#3b82f6",
    },
    {
        title: "Seasoned Otaku",
        badge: "Tier 2",
        description: "Identify iconic openings, legendary voice actors (seiyuu), and major plot twists.",
        meta: "25 Questions • Timed Mode",
        accentColor: "#e63b2e",
    },
    {
        title: "Anime Sage",
        badge: "Tier 3",
        description: "Deep manga lore, 90s vintage masterpieces, animation studio directors, and obscure lore.",
        meta: "Sudden Death • No Lifelines",
        accentColor: "#eab308",
    },
];

export default function QuizSection() {
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasAnswered, setHasAnswered] = useState(false);

    const handleSelect = (optionId: string) => {
        if (hasAnswered) return;
        setSelectedOption(optionId);
        setHasAnswered(true);
    };

    const handleReset = () => {
        setSelectedOption(null);
        setHasAnswered(false);
    };

    const isCurrentCorrect =
        selectedOption !== null &&
        QUESTION_DATA.options.find((o) => o.id === selectedOption)?.isCorrect;

    return (
        <section id="quiz" className="quiz-section" aria-label="Anime Trivia Quiz">
            <div className="quiz-container">
                {/* ── Section Header ── */}
                <div className="quiz-header">
                    <div className="quiz-hashtag-badge">
                        <HugeiconsIcon icon={FireIcon} size={15} strokeWidth={1.8} />
                        <span>Test Your Inner Otaku</span>
                    </div>
                    <h2 className="quiz-title">
                        Think you know anime? Prove it.
                    </h2>
                    <p className="quiz-subtitle">
                        Step up to the arena. Challenge your trivia knowledge on iconic characters,
                        legendary openings, studios, and plot twists to climb the global Otaku leaderboard.
                    </p>
                </div>

                {/* ── Split Layout: Live Question Teaser (Left) + Tiers (Right) ── */}
                <div className="quiz-grid">
                    {/* Left: Interactive Daily Quiz Card */}
                    <div className="quiz-interactive-card">
                        <div className="quiz-card-header">
                            <div className="quiz-card-badge">
                                <HugeiconsIcon icon={Quiz01Icon} size={14} strokeWidth={1.8} />
                                <span>Question of the Day</span>
                            </div>
                            <span className="quiz-difficulty-tag">{QUESTION_DATA.difficulty}</span>
                        </div>

                        <p className="quiz-anime-source">Series: {QUESTION_DATA.anime}</p>
                        <h3 className="quiz-question-text">{QUESTION_DATA.question}</h3>

                        {/* Options List */}
                        <div className="quiz-options-list">
                            {QUESTION_DATA.options.map((opt) => {
                                let btnClass = "quiz-option-btn";
                                if (hasAnswered) {
                                    if (opt.isCorrect) {
                                        btnClass += " quiz-option-correct";
                                    } else if (selectedOption === opt.id) {
                                        btnClass += " quiz-option-wrong";
                                    } else {
                                        btnClass += " quiz-option-disabled";
                                    }
                                }

                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleSelect(opt.id)}
                                        disabled={hasAnswered}
                                        className={btnClass}
                                    >
                                        <span className="quiz-option-letter">{opt.id}</span>
                                        <span className="quiz-option-label">{opt.text}</span>
                                        {hasAnswered && opt.isCorrect && (
                                            <HugeiconsIcon
                                                icon={CheckmarkCircle02Icon}
                                                size={18}
                                                className="quiz-option-icon quiz-icon-correct"
                                            />
                                        )}
                                        {hasAnswered && selectedOption === opt.id && !opt.isCorrect && (
                                            <HugeiconsIcon
                                                icon={CancelCircleIcon}
                                                size={18}
                                                className="quiz-option-icon quiz-icon-wrong"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Result Feedback Banner */}
                        {hasAnswered && (
                            <div
                                className={`quiz-feedback-box ${isCurrentCorrect ? "feedback-success" : "feedback-fail"
                                    }`}
                            >
                                <p className="quiz-feedback-title">
                                    {isCurrentCorrect
                                        ? "🎉 Correct! +50 Otaku EXP"
                                        : "❌ Nice try! Keep practicing."}
                                </p>
                                <p className="quiz-feedback-exp">{QUESTION_DATA.explanation}</p>
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    className="quiz-try-again-btn"
                                >
                                    Try Another Question
                                </button>
                            </div>
                        )}

                        <div className="quiz-card-footer">
                            <HugeiconsIcon icon={HelpCircleIcon} size={15} strokeWidth={1.8} />
                            <span>Over 500+ community questions ready to play</span>
                        </div>
                    </div>

                    {/* Right: Otaku Tier Cards & Category Exploration */}
                    <div className="quiz-tiers-column">
                        <div className="quiz-tiers-intro">
                            <h3 className="quiz-tiers-heading">Choose Your Battleground</h3>
                            <p className="quiz-tiers-sub">
                                Select a difficulty tier that matches your anime watch history:
                            </p>
                        </div>

                        <div className="quiz-tiers-stack">
                            {QUIZ_TIERS.map((tier) => (
                                <div key={tier.title} className="quiz-tier-card">
                                    <div className="quiz-tier-top">
                                        <h4 className="quiz-tier-title">{tier.title}</h4>
                                        <span className="quiz-tier-badge">{tier.badge}</span>
                                    </div>
                                    <p className="quiz-tier-desc">{tier.description}</p>
                                    <div className="quiz-tier-meta">
                                        <HugeiconsIcon icon={Award01Icon} size={14} strokeWidth={1.8} />
                                        <span>{tier.meta}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Link href={ROUTES.DASHBOARD.QUIZ} className="quiz-launch-cta">
                            <span>Start Full Quiz Session</span>
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, X, Check, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";

interface FeedbackPayload {
    speedVote: string;
    featureVote?: string;
    comment?: string;
}

const SPEED_OPTIONS = [
    { id: "very_fast", label: "⚡ Very fast", desc: "Can't wait, ship it!" },
    { id: "fast", label: "🚀 Fast", desc: "Keep up the momentum" },
    { id: "chill", label: "☕ Chill, keep your normal pace", desc: "Take time & polish well" },
];

const FEATURE_OPTIONS = [
    { id: "ai_recommendations", label: "🤖 AI Recommendations" },
    { id: "watchlist_kanban", label: "📑 Watchlist & Kanban" },
    { id: "community_chat", label: "💬 Anime Community Chat" },
    { id: "character_va", label: "🔍 Character & VA Details" },
];

export function FeedbackWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [speedVote, setSpeedVote] = useState<string>("");
    const [featureVote, setFeatureVote] = useState<string>("");
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("animekun_feedback_submitted");
            if (stored === "true") {
                setIsSubmitted(true);
            }
        } catch {
            // ignore localStorage errors in private mode
        }
    }, []);

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!speedVote) {
            setErrorMessage("Please select a completion speed option.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const payload: FeedbackPayload = {
                speedVote,
                featureVote: featureVote || undefined,
                comment: comment.trim() || undefined,
            };

            await api.post("/feedback", payload);
            setIsSubmitted(true);
            try {
                localStorage.setItem("animekun_feedback_submitted", "true");
            } catch {
                // ignore
            }
        } catch (err: unknown) {
            const errorMsg =
                err instanceof Error ? err.message : "Failed to submit feedback. Please try again.";
            setErrorMessage(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setIsSubmitted(false);
        setSpeedVote("");
        setFeatureVote("");
        setComment("");
        setErrorMessage(null);
    };

    return (
        <div className="feedback-widget-container" aria-label="Feedback widget">
            {isOpen && (
                <div className="feedback-popover" role="dialog" aria-modal="true">
                    {/* Header */}
                    <div className="feedback-header">
                        <span className="feedback-header-title">
                            <Sparkles size={16} className="text-accent" />
                            Help Shape AnimeKun
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="feedback-close-btn"
                            aria-label="Close feedback"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {isSubmitted ? (
                        <div className="feedback-success-card">
                            <div className="feedback-success-icon">
                                <Check size={22} />
                            </div>
                            <h4 className="feedback-success-title">Vote Recorded! 🎉</h4>
                            <p className="feedback-success-desc">
                                Thank you! Your vote has been saved directly to our database and helps set our development priority.
                            </p>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="feedback-option-btn text-center justify-center mt-2"
                                style={{ justifyContent: "center" }}
                            >
                                Submit another response
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {/* Question 1: Speed */}
                            <div className="feedback-group">
                                <label className="feedback-label">
                                    How fast do you want the website to be completed? *
                                </label>
                                <div className="feedback-options">
                                    {SPEED_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`feedback-option-btn ${speedVote === opt.id ? "active" : ""}`}
                                            onClick={() => setSpeedVote(opt.id)}
                                        >
                                            <div>
                                                <div>{opt.label}</div>
                                                <div className="text-[11px] opacity-75 font-normal">{opt.desc}</div>
                                            </div>
                                            {speedVote === opt.id && <Check size={14} className="text-accent shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Question 2: Feature Priority */}
                            <div className="feedback-group">
                                <label className="feedback-label">
                                    Which feature do you want next? <span className="text-[11px] font-normal text-muted">(Optional)</span>
                                </label>
                                <div className="feedback-options">
                                    {FEATURE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            className={`feedback-option-btn ${featureVote === opt.id ? "active" : ""}`}
                                            onClick={() => setFeatureVote(featureVote === opt.id ? "" : opt.id)}
                                        >
                                            <span>{opt.label}</span>
                                            {featureVote === opt.id && <Check size={14} className="text-accent shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Comment */}
                            <div className="feedback-group">
                                <label className="feedback-label">
                                    Any suggestions or thoughts? <span className="text-[11px] font-normal text-muted">(Optional)</span>
                                </label>
                                <textarea
                                    className="feedback-textarea"
                                    placeholder="Tell us what you'd love to see..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    maxLength={500}
                                />
                            </div>

                            {errorMessage && (
                                <p className="text-[12px] text-accent font-medium">{errorMessage}</p>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={!speedVote || isSubmitting}
                                className="feedback-submit-btn"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        <span>Saving vote...</span>
                                    </>
                                ) : (
                                    <span>Submit Vote</span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* Floating Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="feedback-trigger-btn"
                aria-label="Feedback button"
            >
                <MessageSquarePlus size={16} />
                <span>Feedback</span>
            </button>
        </div>
    );
}

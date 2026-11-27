"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, Check, Loader2, X } from "lucide-react";

import { api } from "@/lib/api-client";

import { FEEDBACK_NEXT_OPTIONS, type FeedbackNext, type FeedbackRating } from "./constants";
import { markSent, snooze } from "./feedback-store";

const RATINGS: { id: FeedbackRating; label: string; face: string; mood: string }[] = [
    { id: "meh", label: "Meh", face: "(´-ω-`)", mood: "#5b6b8c" },
    { id: "okay", label: "Okay", face: "(・‿・)", mood: "#c9821b" },
    { id: "sugoi", label: "Sugoi", face: "(★▽★)", mood: "#e63b2e" },
];

/** Emojis that pop out from behind the picked face: 1, 2–3, then 5–6. */
const BURST: Record<FeedbackRating, { emojis: string[]; min: number; max: number }> = {
    meh: { emojis: ["😞"], min: 1, max: 1 },
    okay: { emojis: ["🙂", "😊"], min: 2, max: 3 },
    sugoi: { emojis: ["🤩", "✨", "🔥", "💖", "🎉"], min: 5, max: 6 },
};

const BURST_MS = 1300;
/** Exit slide (matches .meyasu.is-leaving in CSS). */
const LEAVE_MS = 220;

interface BurstItem {
    key: number;
    emoji: string;
    style: CSSProperties;
}

interface Burst {
    id: number;
    rating: FeedbackRating;
    items: BurstItem[];
}

// Event handlers only (never during render), so Math.random is fine here.
function makeBurst(rating: FeedbackRating, id: number): Burst {
    const { emojis, min, max } = BURST[rating];
    const count = min + Math.floor(Math.random() * (max - min + 1));
    const items = Array.from({ length: count }, (_, i) => {
        // Fan upwards: one emoji goes straight up, more spread from -150° to -30°.
        const angle =
            count === 1 ? -90 + (Math.random() - 0.5) * 20 : -150 + (120 * i) / (count - 1) + (Math.random() - 0.5) * 16;
        const dist = 46 + Math.random() * 30;
        const rad = (angle * Math.PI) / 180;
        return {
            key: i,
            emoji: emojis[i % emojis.length],
            style: {
                "--dx": `${Math.cos(rad) * dist}px`,
                "--dy": `${Math.sin(rad) * dist}px`,
                "--r": `${(Math.random() - 0.5) * 50}deg`,
                animationDelay: `${i * 45}ms`,
            } as CSSProperties,
        };
    });
    return { id, rating, items };
}

interface FeedbackCardProps {
    /** True when it popped up on its own (closing it snoozes for 30 days). */
    autoOpened: boolean;
    onClose: () => void;
    /** Called once the vote is saved (the host plays the confetti; the card closes right away). */
    onSent: () => void;
}

/**
 * The suggestion-box card: a non-modal card at the bottom of the screen.
 * Tap a face (emojis pop out from behind it), optionally pick what to build
 * next, send.
 */
export function FeedbackCard({ autoOpened, onClose, onSent }: FeedbackCardProps) {
    const titleId = useId();
    const [rating, setRating] = useState<FeedbackRating | null>(null);
    const [next, setNext] = useState<FeedbackNext | null>(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [burst, setBurst] = useState<Burst | null>(null);
    const [leaving, setLeaving] = useState(false);
    const [pickNonce, setPickNonce] = useState(0);

    const firstFace = useRef<HTMLButtonElement>(null);
    const honeypot = useRef<HTMLInputElement>(null);
    const burstId = useRef(0);
    const timers = useRef<number[]>([]);

    const later = (fn: () => void, ms: number) => {
        timers.current.push(window.setTimeout(fn, ms));
    };

    // A send in flight can only be finished by itself (close(true)).
    const close = (sent = false) => {
        if (leaving || (sending && !sent)) return;
        if (!sent && autoOpened) snooze();
        setLeaving(true);
        later(onClose, LEAVE_MS);
    };
    const closeRef = useRef(close);
    useEffect(() => {
        closeRef.current = close;
    });

    useEffect(() => {
        const list = timers.current;
        return () => list.forEach((id) => window.clearTimeout(id));
    }, []);

    // Opened from the footer link: move focus in. Popped up on its own:
    // leave focus where it is, so it never interrupts.
    useEffect(() => {
        if (!autoOpened) firstFace.current?.focus();
    }, [autoOpened]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const pickRating = (id: FeedbackRating) => {
        setRating(id);
        setError(null);
        setPickNonce((n) => n + 1);
        const b = makeBurst(id, ++burstId.current);
        setBurst(b);
        later(() => setBurst((cur) => (cur?.id === b.id ? null : cur)), BURST_MS);
    };

    const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!rating) {
            setError("Pick a face first.");
            return;
        }
        setSending(true);
        setError(null);
        try {
            await api.post("/feedback", {
                rating,
                next: next ?? undefined,
                page: window.location.pathname,
                website: honeypot.current?.value || undefined,
            });
            markSent();
            onSent();
            close(true);
        } catch {
            setSending(false);
            setError("Couldn't send that. Try again.");
        }
    };

    const mood = RATINGS.find((r) => r.id === rating)?.mood ?? "var(--accent)";

    return (
        <aside
            className={`meyasu${leaving ? " is-leaving" : ""}`}
            style={{ "--mood": mood } as CSSProperties}
            role="dialog"
            aria-labelledby={titleId}
        >
            <div className="meyasu-lid">
                <span className="meyasu-lid-label">Suggestion box</span>
                <button type="button" className="meyasu-close" onClick={() => close()} aria-label="Close feedback">
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <form className="meyasu-body" onSubmit={handleSubmit} noValidate>
                <h2 id={titleId} className="meyasu-title">
                    How&apos;s AnimeKun treating you?
                </h2>
                <p className="meyasu-sub">One tap is enough.</p>

                <div className={`meyasu-faces${rating ? " has-pick" : ""}`} role="radiogroup" aria-label="Your rating">
                    {RATINGS.map(({ id, label, face }, i) => (
                        <div key={id} className="meyasu-face-wrap">
                            {burst?.rating === id &&
                                burst.items.map((item) => (
                                    <span
                                        key={`${burst.id}-${item.key}`}
                                        className="meyasu-burst"
                                        style={item.style}
                                        aria-hidden="true"
                                    >
                                        {item.emoji}
                                    </span>
                                ))}
                            <button
                                ref={i === 0 ? firstFace : undefined}
                                type="button"
                                role="radio"
                                aria-checked={rating === id}
                                className={`meyasu-face${rating === id ? " is-on" : ""}`}
                                onClick={() => pickRating(id)}
                            >
                                <span key={rating === id ? pickNonce : 0} className="meyasu-kao" aria-hidden="true">
                                    {face}
                                </span>
                                {label}
                            </button>
                        </div>
                    ))}
                </div>

                <div className={`meyasu-more${rating ? " is-open" : ""}`} inert={!rating}>
                    <div className="meyasu-more-inner">
                        <p className="meyasu-q" id={`${titleId}-next`}>
                            What should we build next? <span>(optional)</span>
                        </p>
                        <div className="meyasu-chips" role="radiogroup" aria-labelledby={`${titleId}-next`}>
                            {FEEDBACK_NEXT_OPTIONS.map((o) => (
                                <button
                                    key={o.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={next === o.id}
                                    className={`meyasu-chip${next === o.id ? " is-on" : ""}`}
                                    onClick={() => setNext((cur) => (cur === o.id ? null : o.id))}
                                >
                                    {next === o.id && <Check size={13} strokeWidth={3} aria-hidden="true" />}
                                    {o.label}
                                </button>
                            ))}
                        </div>

                        <div className="meyasu-foot">
                            <button type="submit" className="meyasu-send" disabled={sending}>
                                {sending ? "Sending" : "Send"}
                                {sending ? (
                                    <Loader2 size={15} className="meyasu-spin" aria-hidden="true" />
                                ) : (
                                    <ArrowUp size={15} aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Honeypot: hidden from people and screen readers. */}
                <input
                    ref={honeypot}
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="meyasu-hp"
                />

                {error && (
                    <p className="meyasu-error" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </aside>
    );
}

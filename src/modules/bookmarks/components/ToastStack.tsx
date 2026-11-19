"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Undo2 } from "lucide-react";

export interface StackToast {
    key: number;
    message: ReactNode;
    onUndo?: () => void;
    // Move focus to its Undo button when it appears (the removed card had focus).
    focus?: boolean;
    // Playing its exit; keeps the slot it had (frozenIndex) while it fades.
    leaving?: boolean;
    frozenIndex?: number;
}

interface ToastStackProps {
    toasts: StackToast[]; // oldest → newest
    onExpire: (key: number) => void;
}

const COLLAPSED_VISIBLE = 3;

/**
 * Stacked toasts (bottom centre). Collapsed: the newest is in front and up
 * to two older ones peek out behind it. Hover / focus (desktop) or a tap
 * (phones) fans the stack out so every toast and its Undo can be reached;
 * while it's open, every timer pauses. Each toast has its own progress bar,
 * and that bar's CSS animation is its timer (animationend → onExpire).
 * Layout and motion live in globals.css (.toast-stack).
 */
export function ToastStack({ toasts, onExpire }: ToastStackProps) {
    const [expandedState, setExpanded] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const live = toasts.filter((t) => !t.leaving);
    const count = live.length;
    const expanded = expandedState && count > 0;

    // Phones: a tap outside closes the fanned-out stack.
    useEffect(() => {
        if (!expanded) return;
        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== "mouse" && !rootRef.current?.contains(e.target as Node)) setExpanded(false);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [expanded]);

    if (toasts.length === 0) return null;

    return (
        <div
            ref={rootRef}
            className={`toast-stack${expanded ? " is-expanded" : ""}`}
            style={{ "--count": Math.max(1, count) } as CSSProperties}
            role="region"
            aria-label="Notifications"
            onPointerEnter={(e) => e.pointerType === "mouse" && setExpanded(true)}
            onPointerLeave={(e) => e.pointerType === "mouse" && setExpanded(false)}
            // Keyboard focus only: a click on Undo also focuses it, and that
            // must not freeze the other toasts' timers.
            onFocus={(e) => e.target.matches(":focus-visible") && setExpanded(true)}
            onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setExpanded(false);
            }}
            onClick={(e) => {
                // Tap on a collapsed stack (not on a button) fans it out.
                if (!expanded && count > 1 && !(e.target as Element).closest("button")) setExpanded(true);
            }}
        >
            {toasts.map((toast) => {
                const liveIndex = live.indexOf(toast);
                // 0 = front (newest). Leaving toasts keep the slot they had.
                const index = toast.leaving ? (toast.frozenIndex ?? 0) : count - 1 - liveIndex;
                return (
                    <ToastCard
                        key={toast.key}
                        toast={toast}
                        index={index}
                        hidden={!expanded && index >= COLLAPSED_VISIBLE}
                        onExpire={() => onExpire(toast.key)}
                    />
                );
            })}
        </div>
    );
}

function ToastCard({
    toast,
    index,
    hidden,
    onExpire,
}: {
    toast: StackToast;
    index: number;
    hidden: boolean;
    onExpire: () => void;
}) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const focusOnMount = useRef(toast.focus);

    useEffect(() => {
        if (focusOnMount.current) buttonRef.current?.focus();
    }, []);

    const className = ["stack-toast", index === 0 && "is-front", toast.leaving && "is-leaving", hidden && "is-hidden"]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            className={className}
            style={{ "--i": index } as CSSProperties}
            role="status"
            aria-hidden={hidden || toast.leaving || undefined}
            inert={hidden || toast.leaving}
        >
            <span className="stack-toast-text">{toast.message}</span>
            {toast.onUndo && (
                <button ref={buttonRef} type="button" className="stack-toast-btn" onClick={toast.onUndo}>
                    <Undo2 size={14} aria-hidden="true" />
                    Undo
                </button>
            )}
            {/* Time left: drains right to left; its end closes the toast. */}
            <span
                className="stack-toast-progress"
                aria-hidden="true"
                onAnimationEnd={toast.leaving ? undefined : onExpire}
            />
        </div>
    );
}

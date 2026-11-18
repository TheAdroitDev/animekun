"use client";

import {
    useEffect,
    useId,
    useImperativeHandle,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type Ref,
} from "react";

import { ease, type BinTarget } from "../utils/toss";
import { BumpCount } from "./BumpCount";

export interface TossBinHandle extends BinTarget {
    /** Meal-ticket badge: +1 when a ball lands, -1 when Undo pops one out. */
    add(delta: number): void;
}

const VIEW_H = 62; // SVG viewBox height
const MOUTH_Y = 22; // broth surface, in viewBox units
const OPEN_DEG = 38; // chopsticks swing up around their right end
const DROPS = 6; // broth droplets per splash
const FRAME = 1000 / 60;

/** Keyframes for the chopsticks rotating from → to with a JS easing curve. */
function rotateFrames(from: number, to: number, fn: (t: number) => number, duration: number): Keyframe[] {
    const steps = Math.max(2, Math.ceil(duration / FRAME));
    return Array.from({ length: steps + 1 }, (_, i) => ({
        transform: `rotate(${from + (to - from) * fn(i / steps)}deg)`,
    }));
}

/**
 * The ramen bowl the cards are tossed into (fixed, bottom left; the feedback
 * widget owns bottom right). The paper ball sinks into the broth with a
 * splash; the chopsticks lift out of the way like a lid. Two layers so the
 * ball (z-index between them) goes *into* the bowl: the back layer draws the
 * broth and toppings, the front layer the bowl, chopsticks, steam and the
 * meal-ticket (食券) badge. Decorative only: the Undo toast is what screen
 * readers hear.
 */
interface TossBinProps {
    ref: Ref<TossBinHandle>;
    // Anime in the bowl that can come back (removed this visit).
    restoreCount: number;
    onRestoreAll: () => void;
}

const ARM_MS = 3000; // second tap must come within 3 s

export function TossBin({ ref, restoreCount, onRestoreAll }: TossBinProps) {
    const gid = useId().replace(/:/g, "");
    // Tap twice to bring everything back: the first tap "arms" the bowl and
    // shows a speech bubble; the second (within 3 s) restores.
    const [armedVerb, setArmedVerb] = useState<string | null>(null);
    const armTimer = useRef<number | undefined>(undefined);
    const armed = armedVerb !== null && restoreCount > 0;

    useEffect(() => () => window.clearTimeout(armTimer.current), []);

    function handleBowlClick(e: ReactMouseEvent<HTMLButtonElement>) {
        window.clearTimeout(armTimer.current);
        if (armed) {
            setArmedVerb(null);
            onRestoreAll();
            return;
        }
        // detail 0 = keyboard; pointerType tells mouse from touch.
        const native = e.nativeEvent as PointerEvent;
        setArmedVerb(e.detail === 0 ? "Press" : native.pointerType === "mouse" ? "Click" : "Tap");
        armTimer.current = window.setTimeout(() => setArmedVerb(null), ARM_MS);
    }
    const backRef = useRef<HTMLDivElement>(null);
    const frontRef = useRef<HTMLDivElement>(null);
    const lidRef = useRef<SVGGElement>(null); // the chopsticks
    const rippleRef = useRef<SVGEllipseElement>(null);
    const steamRef = useRef<SVGGElement>(null);
    const dropRefs = useRef<(SVGCircleElement | null)[]>([]);
    const [count, setCount] = useState(0);

    const holds = useRef(0);
    const angle = useRef(0);
    const closeTimer = useRef<number | undefined>(undefined);

    useImperativeHandle(ref, () => {
        function rotateChopsticks(to: number, duration: number, fn: (t: number) => number) {
            const lid = lidRef.current;
            const from = angle.current;
            angle.current = to;
            if (!lid) return Promise.resolve();
            return lid
                .animate(rotateFrames(from, to, fn, duration), { duration, fill: "forwards" })
                .finished.then(() => undefined, () => undefined);
        }

        // Chopsticks back down: a little clack bounce, and the bowl wobbles.
        function clack() {
            const wobble: Keyframe[] = [];
            const bounce: Keyframe[] = [];
            for (let i = 0; i <= 36; i++) {
                const t = (i / 36) * 0.6;
                const b = Math.exp(-t / 0.11) * Math.sin((t * Math.PI * 2) / 0.22);
                wobble.push({ transform: `scale(${1 + 0.025 * b}, ${1 - 0.035 * b})` });
                const a = 6 * Math.exp(-t / 0.08) * Math.abs(Math.sin((t * Math.PI) / 0.08));
                bounce.push({ transform: `rotate(${a}deg)` });
            }
            backRef.current?.animate(wobble, 600);
            frontRef.current?.animate(wobble, 600);
            lidRef.current?.animate(bounce, { duration: 500, fill: "forwards" });
        }

        return {
            mouth() {
                const r = frontRef.current?.getBoundingClientRect();
                if (!r) return { x: 60, y: window.innerHeight - 60 };
                return { x: r.left + r.width / 2, y: r.top + (r.height * MOUTH_Y) / VIEW_H };
            },
            open() {
                holds.current += 1;
                window.clearTimeout(closeTimer.current);
                if (angle.current !== OPEN_DEG) {
                    const from = angle.current / OPEN_DEG; // 0 resting … 1 lifted
                    void rotateChopsticks(OPEN_DEG, 360 * (1 - from) + 60, ease.outBack);
                }
            },
            close() {
                holds.current = Math.max(0, holds.current - 1);
                if (holds.current > 0) return;
                window.clearTimeout(closeTimer.current);
                closeTimer.current = window.setTimeout(() => {
                    if (holds.current > 0) return;
                    void rotateChopsticks(0, 240, ease.inCubic).then(clack);
                }, 120);
            },
            // Broth splash: droplets fly up and fall back, a ripple spreads,
            // the steam puffs up.
            splash() {
                dropRefs.current.forEach((drop, i) => {
                    if (!drop) return;
                    const dx = (i - (DROPS - 1) / 2) * 5 + (Math.random() - 0.5) * 4;
                    const h = 9 + Math.random() * 10;
                    const frames: Keyframe[] = [];
                    for (let s = 0; s <= 24; s++) {
                        const t = s / 24;
                        frames.push({
                            transform: `translate(${dx * t}px, ${-h * 4 * t * (1 - t)}px)`,
                            opacity: t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
                        });
                    }
                    drop.animate(frames, { duration: 420 + Math.random() * 120, easing: "linear" });
                });
                rippleRef.current?.animate(
                    [
                        { transform: "scale(0.3)", opacity: 0.9 },
                        { transform: "scale(2.6)", opacity: 0 },
                    ],
                    { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
                );
                steamRef.current?.animate(
                    [
                        { opacity: 0.35, transform: "translateY(0)" },
                        { opacity: 0.9, transform: "translateY(-4px)", offset: 0.3 },
                        { opacity: 0.35, transform: "translateY(0)" },
                    ],
                    { duration: 900, easing: "ease-out" },
                );
            },
            add(delta: number) {
                setCount((c) => Math.max(0, c + delta));
            },
        };
    }, []);

    return (
        <>
            {/* Back: broth surface + toppings (the ball lands on top of these). */}
            <div ref={backRef} className="toss-bin toss-bin-back" aria-hidden="true">
                <svg viewBox="0 0 80 62">
                    <defs>
                        <radialGradient id={`${gid}-broth`} cx=".45" cy=".35" r=".7">
                            <stop offset="0" stopColor="#f6d38a" />
                            <stop offset=".6" stopColor="#e2a64a" />
                            <stop offset="1" stopColor="#b9772c" />
                        </radialGradient>
                    </defs>
                    <ellipse cx="40" cy="22" rx="31" ry="7.6" fill={`url(#${gid}-broth)`} />
                    {/* Nori standing up at the back */}
                    <path d="M16 21 L18 6 L30 7.5 L28.5 20.5 Z" fill="#1d3527" stroke="#12241a" strokeWidth=".6" />
                    {/* Half egg */}
                    <ellipse cx="29" cy="23.5" rx="6.2" ry="3.4" fill="#fffaf0" />
                    <ellipse cx="29.4" cy="23.6" rx="3" ry="1.8" fill="#f2a516" />
                    {/* Narutomaki: white slice with a pink swirl */}
                    <ellipse cx="53" cy="20.5" rx="6" ry="3" fill="#fffdfb" stroke="#eadbd6" strokeWidth=".5" />
                    <path
                        d="M53 20.5 c1.2 -.2 1.8 .6 1 1.2 c-1.4 1 -3.4 0 -3 -1.4 c.6 -1.8 3.6 -2 4.6 -.2"
                        fill="none"
                        stroke="#ec6f9a"
                        strokeWidth=".9"
                        strokeLinecap="round"
                    />
                    {/* Green onions */}
                    <g fill="#5fae4a">
                        <ellipse cx="40" cy="25" rx="1.6" ry=".9" />
                        <ellipse cx="44" cy="23" rx="1.4" ry=".8" />
                        <ellipse cx="37" cy="21" rx="1.3" ry=".8" />
                        <ellipse cx="46" cy="26" rx="1.3" ry=".8" />
                    </g>
                    <ellipse
                        ref={rippleRef}
                        className="toss-bowl-ripple"
                        cx="40"
                        cy="22"
                        rx="10"
                        ry="2.6"
                        fill="none"
                        stroke="rgba(255,255,255,.85)"
                        strokeWidth="1"
                        opacity="0"
                    />
                </svg>
            </div>

            {/* Front: bowl, chopsticks, steam, splash droplets, meal ticket. */}
            <div ref={frontRef} className={`toss-bin toss-bin-front${armed ? " is-armed" : ""}`}>
                <svg viewBox="0 0 80 62" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${gid}-bowl`} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="#e4e0d8" />
                            <stop offset=".45" stopColor="#ffffff" />
                            <stop offset="1" stopColor="#dcd7ce" />
                        </linearGradient>
                        {/* 雷文 (raimon): the classic ramen-bowl key pattern */}
                        <pattern id={`${gid}-raimon`} width="7" height="7" patternUnits="userSpaceOnUse">
                            <rect width="7" height="7" fill="#c8332b" />
                            <path d="M1 6 V1 H6 V5 H3 V3 H4.5" fill="none" stroke="#fff" strokeWidth=".8" />
                        </pattern>
                        <clipPath id={`${gid}-clip`}>
                            <path d="M9 22 A31 7.6 0 0 0 71 22 C69.5 39 58 51 40 51 C22 51 10.5 39 9 22 Z" />
                        </clipPath>
                    </defs>
                    {/* Steam wisps (drift gently via CSS; still with reduced motion) */}
                    <g ref={steamRef} className="toss-bowl-steam" opacity=".35">
                        <path d="M30 4 c-3 -4 3 -6 0 -10 c-2 -3 1 -5 0 -7" />
                        <path d="M41 2 c-3 -4 3 -6 0 -10 c-2 -3 1 -5 0 -8" />
                        <path d="M52 4 c-3 -4 3 -6 0 -10 c-2 -3 1 -5 0 -7" />
                    </g>
                    {/* Foot */}
                    <ellipse cx="40" cy="51.5" rx="12" ry="2.6" fill="#cfc9bf" />
                    {/* Body: its top edge is the front half of the broth surface. */}
                    <path
                        d="M9 22 A31 7.6 0 0 0 71 22 C69.5 39 58 51 40 51 C22 51 10.5 39 9 22 Z"
                        fill={`url(#${gid}-bowl)`}
                    />
                    <rect
                        x="0"
                        y="31"
                        width="80"
                        height="6.5"
                        fill={`url(#${gid}-raimon)`}
                        clipPath={`url(#${gid}-clip)`}
                    />
                    {/* Rim: white lip with a thin red line */}
                    <path d="M9 22 A31 7.6 0 0 0 71 22" fill="none" stroke="#f8f6f2" strokeWidth="2.6" />
                    <path d="M11.5 23.4 A28.6 6.6 0 0 0 68.5 23.4" fill="none" stroke="#c8332b" strokeWidth=".8" />
                    {/* Splash droplets (hidden until a splash) */}
                    {Array.from({ length: DROPS }, (_, i) => (
                        <circle
                            key={i}
                            ref={(el) => {
                                dropRefs.current[i] = el;
                            }}
                            className="toss-bowl-drop"
                            cx="40"
                            cy="21"
                            r={i % 2 ? 1.3 : 1.7}
                            fill="#eab25a"
                        />
                    ))}
                    {/* Chopsticks resting across the rim, pivot at the right end */}
                    <g ref={lidRef} className="toss-bin-lid">
                        <path d="M11 13 L76 21" stroke="#4a2c1a" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M12 17 L76 24" stroke="#5a3621" strokeWidth="2.4" strokeLinecap="round" />
                        <path d="M11 13 L22 14.4 M12 17 L23 18.2" stroke="#e2c79a" strokeWidth="2.4" strokeLinecap="round" />
                    </g>
                </svg>
                {restoreCount > 0 && (
                    <button
                        type="button"
                        className="toss-bin-button"
                        aria-label={
                            armed
                                ? `Bring back ${restoreCount} removed anime`
                                : `Removed anime: ${restoreCount}. Press twice to bring them back`
                        }
                        onClick={handleBowlClick}
                    />
                )}
                {armed && (
                    <span className="toss-bubble" role="status">
                        {armedVerb} again to bring back {restoreCount} anime
                    </span>
                )}
                {count > 0 && (
                    // 食券: the meal ticket from a ramen-shop ticket machine
                    <span className="toss-ticket" aria-hidden="true">
                        <span className="toss-ticket-label">食券</span>
                        <span>
                            ×<BumpCount value={count} className="toss-ticket-num" />
                        </span>
                    </span>
                )}
            </div>
        </>
    );
}

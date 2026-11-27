import type { CSSProperties } from "react";

/**
 * Full-screen confetti + sakura petals, pure CSS (`.welcome-fx` styles in
 * globals.css). Shared by the sign-in celebration and the feedback card.
 * Mount it to play once; unmount it when done (about 4.5s). Hidden for
 * people who prefer reduced motion.
 */

export type ConfettiVariant = "full" | "petals";

const COLORS = ["#e63b2e", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"];

/** How long the longest particle can take (delay + duration). */
export const CONFETTI_MS = 4500;

// Deterministic "random" (render must stay pure, so no Math.random)
const rand = (i: number, n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
};

const makeParticles = (count: number, petalsOnly: boolean) =>
    Array.from({ length: count }, (_, i) => ({
        petal: petalsOnly || i % 3 === 0,
        style: {
            "--x": `${rand(i, 1) * 100}%`,
            "--dx": `${(rand(i, 2) - 0.5) * 160}px`,
            "--spin": `${360 + rand(i, 3) * 540}deg`,
            "--s": `${7 + rand(i, 4) * 7}px`,
            "--c": COLORS[i % COLORS.length],
            animationDelay: `${rand(i, 5) * 0.9}s`,
            animationDuration: `${2.4 + rand(i, 6) * 1.4}s`,
        } as CSSProperties,
    }));

const PARTICLES: Record<ConfettiVariant, ReturnType<typeof makeParticles>> = {
    full: makeParticles(40, false),
    petals: makeParticles(16, true),
};

export function Confetti({ variant = "full" }: { variant?: ConfettiVariant }) {
    return (
        <div className="welcome-fx" aria-hidden="true">
            {PARTICLES[variant].map((p, i) => (
                <span
                    key={i}
                    className={p.petal ? "welcome-particle welcome-particle--petal" : "welcome-particle"}
                    style={p.style}
                />
            ))}
        </div>
    );
}

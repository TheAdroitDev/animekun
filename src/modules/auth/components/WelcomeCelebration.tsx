"use client";

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from "react";
import { PartyPopper } from "lucide-react";

import { useSession } from "@/lib/auth-client";

/**
 * Post-login surprise. GoogleSignInButton returns users with ?welcome=:
 * - "new"  (first sign-up): confetti + sakura petals, "Welcome to AnimeKun!"
 * - "back" (returning):     a light petal fall, "Okaeri!"
 * Plays once, then removes the flag from the URL (a refresh won't replay it).
 * Pure CSS animation, no library; without the flag it renders nothing.
 */

type Kind = "new" | "back";

const COLORS = ["#e63b2e", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"];
const DURATION_MS = 4000;

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

const PARTICLES: Record<Kind, ReturnType<typeof makeParticles>> = {
    new: makeParticles(40, false),
    back: makeParticles(16, true),
};

// Read the flag once per page load (the OAuth return is a full page load)
let initialFlag: string | null | undefined;
const readFlag = () => {
    if (initialFlag === undefined) initialFlag = new URLSearchParams(window.location.search).get("welcome");
    return initialFlag;
};
const noopSubscribe = () => () => {};

export function WelcomeCelebration() {
    const flag = useSyncExternalStore(noopSubscribe, readFlag, () => null);
    const kind: Kind | null = flag === "new" || flag === "back" ? flag : null;
    const [done, setDone] = useState(false);
    const { data: session } = useSession(); // shared with the Navbar, no extra request

    useEffect(() => {
        if (!kind) return;
        const url = new URL(window.location.href);
        url.searchParams.delete("welcome");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
        const timer = setTimeout(() => setDone(true), DURATION_MS);
        return () => clearTimeout(timer);
    }, [kind]);

    if (!kind || done) return null;

    const firstName = session?.user.name.split(" ")[0];

    return (
        <>
            <div className="welcome-fx" aria-hidden="true">
                {PARTICLES[kind].map((p, i) => (
                    <span key={i} className={p.petal ? "welcome-particle welcome-particle--petal" : "welcome-particle"} style={p.style} />
                ))}
            </div>
            <div className="welcome-toast" role="status">
                {kind === "new" ? (
                    <>
                        <PartyPopper size={18} className="welcome-toast-icon" />
                        <span>
                            Welcome to AnimeKun{firstName ? `, ${firstName}` : ""}! 🎉
                            <span className="welcome-toast-sub">Your account is ready.</span>
                        </span>
                    </>
                ) : (
                    <span>Okaeri{firstName ? `, ${firstName}-san` : ""}! ✌🏻</span>
                )}
            </div>
        </>
    );
}

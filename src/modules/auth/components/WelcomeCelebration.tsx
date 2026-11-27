"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { PartyPopper } from "lucide-react";

import { Confetti } from "@/components/effects/Confetti";
import { trackEvent } from "@/components/analytics/TracwellAnalytics";
import { useSession } from "@/lib/auth-client";

/**
 * Post-login surprise. GoogleSignInButton returns users with ?welcome=:
 * - "new"  (first sign-up): confetti + sakura petals, "Welcome to AnimeKun!"
 * - "back" (returning):     a light petal fall, "Okaeri!"
 * Plays once, then removes the flag from the URL (a refresh won't replay it).
 * Pure CSS animation, no library; without the flag it renders nothing.
 */

type Kind = "new" | "back";

const DURATION_MS = 4000;

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
        trackEvent(kind === "new" ? "sign_up_completed" : "sign_in_completed", { provider: "google" });
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
            <Confetti variant={kind === "new" ? "full" : "petals"} />
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

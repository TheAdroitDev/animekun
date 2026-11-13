import type { Metadata } from "next";

import { AuthCard } from "@/modules/auth/components/AuthCard";
import { GoogleSignInButton } from "@/modules/auth/components/GoogleSignInButton";
import { LoginBackdrop } from "@/modules/auth/components/LoginBackdrop";
import { OAuthErrorMessage } from "@/modules/auth/components/OAuthErrorMessage";
import { getLoginPosters } from "@/modules/auth/utils/login-posters";

// Static page (ISR): no session check here (that would make it dynamic).
// Google-only: first sign-in creates the account (/auth/signup redirects here).
export const metadata: Metadata = {
    title: "Sign in | AnimeKun",
    description: "Sign in to AnimeKun with Google.",
    robots: { index: false, follow: true },
};

// Dome posters come from Tenrai at build time, refreshed at most once a day
// (only when someone visits after the window). Visitors always get cached HTML.
// Gotcha: the build waits on Tenrai (10s timeout per call); getLoginPosters
// falls back to the featured list, so a slow/down Tenrai can't break a deploy.
export const revalidate = 86400;

export default async function LoginPage() {
    const posters = await getLoginPosters();

    return (
        <AuthCard
            backdrop={<LoginBackdrop posters={posters} />}
            title="Welcome to AnimeKun"
            subtitle="Explore thousands of anime. Sign in with Google to save bookmarks, take quizzes and get recommendations."
        >
            <OAuthErrorMessage />
            <GoogleSignInButton />
        </AuthCard>
    );
}

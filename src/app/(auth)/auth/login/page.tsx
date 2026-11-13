import type { Metadata } from "next";

import { AuthCard } from "@/modules/auth/components/AuthCard";
import { GoogleSignInButton } from "@/modules/auth/components/GoogleSignInButton";
import { OAuthErrorMessage } from "@/modules/auth/components/OAuthErrorMessage";

// Static page: no session check here (that would make it dynamic).
// Google-only: first sign-in creates the account (/auth/signup redirects here).
export const metadata: Metadata = {
    title: "Sign in | AnimeKun",
    description: "Sign in to AnimeKun with Google.",
    robots: { index: false, follow: true },
};

export default function LoginPage() {
    return (
        <AuthCard
            title="Welcome to AnimeKun"
            subtitle="Sign in with Google to save bookmarks, take quizzes and get recommendations. New here? Your account is created automatically."
        >
            <OAuthErrorMessage />
            <GoogleSignInButton />
        </AuthCard>
    );
}

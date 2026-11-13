"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Shows a readable message when Better Auth redirects back to the login page
 * with ?error= after a failed Google sign-in. Only this component reads the
 * URL (inside Suspense), so the login page stays static.
 */
export function OAuthErrorMessage() {
    return (
        <Suspense fallback={null}>
            <OAuthErrorFromUrl />
        </Suspense>
    );
}

function OAuthErrorFromUrl() {
    const error = useSearchParams().get("error");
    const message = getOAuthErrorMessage(error);

    if (!message) return null;

    return (
        <p className="auth-form-error" role="alert">
            {message}
        </p>
    );
}

function getOAuthErrorMessage(error: string | null): string | null {
    if (!error) return null;

    // Normalize "account not linked" / "account_not_linked" / casing.
    const code = error.toLowerCase().replace(/[\s-]+/g, "_");

    if (code === "account_not_linked") {
        // Only possible for leftover accounts from before Google-only sign-in.
        // Don't tell people to use a password: they may never have set one.
        return "This email belongs to an older account that can't use Google sign-in yet. Please contact support.";
    }
    // User cancelled on Google's screen: not an error worth showing.
    if (code === "access_denied") return null;

    return "Google sign-in failed. Please try again.";
}

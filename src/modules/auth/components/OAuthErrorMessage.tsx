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
        return "This email is already registered with a password. Log in with your password instead.";
    }
    // User cancelled on Google's screen: not an error worth showing.
    if (code === "access_denied") return null;

    return "Google sign-in failed. Please try again.";
}

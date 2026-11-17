import Link from "next/link";

import { LIMITS } from "@/lib/constants/limits";

import type { ActionError } from "../types";

const MESSAGES: Record<Exclude<ActionError, "unauthorized">, string> = {
    limit: `You've reached the ${LIMITS.FREE.BOOKMARKS_PER_USER} bookmark limit.`,
    invalid: "Couldn't save that. Please try again.",
    server: "Couldn't save that. Please try again.",
};

interface BookmarkErrorMessageProps {
    error: ActionError;
    // Where "Sign in again" should come back to.
    loginHref: string;
    className?: string;
}

/** Shown after a failed save (the change has already been rolled back). */
export function BookmarkErrorMessage({ error, loginHref, className = "bookmark-error" }: BookmarkErrorMessageProps) {
    return (
        <p className={className} role="alert">
            {error === "unauthorized" ? (
                <>
                    Your session expired. <Link href={loginHref}>Sign in again</Link>.
                </>
            ) : (
                MESSAGES[error]
            )}
        </p>
    );
}

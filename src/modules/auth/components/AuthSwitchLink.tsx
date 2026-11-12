"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { getSafeRedirect } from "@/modules/auth/utils/safe-redirect";

interface AuthSwitchLinkProps {
    prompt: string;
    linkText: string;
    href: string;
}

/**
 * "Don't have an account? Sign up" (and the reverse).
 * Carries a safe ?redirect= over, so switching between login and signup
 * doesn't lose where the user was going.
 *
 * Only this link reads the URL (inside Suspense), so the page stays static.
 */
export function AuthSwitchLink(props: AuthSwitchLinkProps) {
    return (
        <Suspense fallback={<SwitchLink {...props} />}>
            <SwitchLinkWithRedirect {...props} />
        </Suspense>
    );
}

function SwitchLinkWithRedirect(props: AuthSwitchLinkProps) {
    const searchParams = useSearchParams();
    const redirect = getSafeRedirect(searchParams.get("redirect"), "");

    const href = redirect
        ? `${props.href}?redirect=${encodeURIComponent(redirect)}`
        : props.href;

    return <SwitchLink {...props} href={href} />;
}

function SwitchLink({ prompt, linkText, href }: AuthSwitchLinkProps) {
    return (
        <p className="auth-switch">
            {prompt}{" "}
            <Link href={href} className="auth-switch-link">
                {linkText}
            </Link>
        </p>
    );
}

import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for CLIENT components only (forms, Navbar).
 * Server code uses `auth` from "@/auth" instead.
 *
 * No baseURL: the app and /api/auth are on the same origin, so requests
 * go to the current host (localhost in dev, your domain in production).
 */
export const authClient = createAuthClient({
    sessionOptions: {
        // Default true: every tab re-focus calls /api/auth/get-session (a
        // function invocation). Cross-tab sign-in/out still syncs via
        // Better Auth's broadcast channel, so this costs almost nothing.
        refetchOnWindowFocus: false,
    },
});

// Google-only sign-in: no signUp export (first Google sign-in creates the account).
export const { signIn, signOut, useSession } = authClient;

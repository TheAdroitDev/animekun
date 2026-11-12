import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for CLIENT components only (forms, Navbar).
 * Server code uses `auth` from "@/auth" instead.
 *
 * No baseURL: the app and /api/auth are on the same origin, so requests
 * go to the current host (localhost in dev, your domain in production).
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

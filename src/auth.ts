import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";

/**
 * Better Auth — single file for config + instance (server only).
 *
 * baseURL and secret are not passed: Better Auth reads BETTER_AUTH_URL and
 * BETTER_AUTH_SECRET from the environment (validated in lib/config/env.ts).
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        usePlural: true, // users, sessions, accounts, verifications
        schema,
        // drizzle-orm/neon-http has no transaction support (it throws), so
        // keep multi-step writes sequential. This is the default; explicit
        // so nobody flips it on without switching drivers.
        transaction: false,
    }),

    // Map Better Auth's field names to our existing columns
    user: {
        fields: { image: "avatarUrl" },
    },
    account: {
        fields: { accountId: "providerAccountId" },
        // Encrypt OAuth access + refresh tokens at rest with BETTER_AUTH_SECRET.
        // Note: Better Auth does NOT encrypt id_token (stored as-is).
        // We never call Google APIs, so a secret rotation losing old tokens is fine.
        encryptOAuthTokens: true,
    },

    // Google-only sign-in. Email/password is OFF on purpose: Google verifies
    // every email, so nobody can register someone else's address (email
    // squatting), there are no passwords to brute-force or leak, and we
    // never need email verification / password-reset infrastructure.
    // With this off, Better Auth rejects /sign-up/email and /sign-in/email
    // server-side (400), even if called directly.
    emailAndPassword: {
        enabled: false,
    },

    // Google is enabled only when both credentials are set (see env.ts).
    // Account linking keeps Better Auth's default requireLocalEmailVerified,
    // so Google never links into a leftover unverified password account
    // (those get "account_not_linked" instead).
    socialProviders: {
        ...(googleClientId &&
            googleClientSecret && {
                google: {
                    clientId: googleClientId,
                    clientSecret: googleClientSecret,
                    prompt: "select_account", // let users with several Google accounts choose
                },
            }),
    },

    session: {
        // Signed cookie holds the session for 5 min, so useSession/getSession
        // skip the database most of the time.
        cookieCache: { enabled: true, maxAge: 5 * 60 },
    },

    advanced: {
        // Postgres generates uuid ids (uuid().defaultRandom() in the schema)
        database: { generateId: false },
    },

    plugins: [nextCookies()], // must stay last
});

export type Session = typeof auth.$Infer.Session;

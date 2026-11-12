import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@/modules/auth/validations/auth-schema";

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
        // Encrypt OAuth access/refresh/id tokens at rest with BETTER_AUTH_SECRET.
        // We never call Google APIs, so a secret rotation losing old tokens is fine.
        encryptOAuthTokens: true,
    },

    emailAndPassword: {
        enabled: true,
        // Same limits as the signup form (modules/auth/validations)
        minPasswordLength: PASSWORD_MIN_LENGTH,
        maxPasswordLength: PASSWORD_MAX_LENGTH,
        autoSignIn: true, // log in right after signup
        // requireEmailVerification stays off: no email sending yet
    },

    // Google is enabled only when both credentials are set (see env.ts).
    // Account linking keeps Better Auth's default requireLocalEmailVerified:
    // Google is NOT linked to an existing password account with an
    // unverified email (prevents pre-account takeover while we have no
    // email verification). Users get "account_not_linked" instead.
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

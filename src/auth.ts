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
    },

    emailAndPassword: {
        enabled: true,
        // Same limits as the signup form (modules/auth/validations)
        minPasswordLength: PASSWORD_MIN_LENGTH,
        maxPasswordLength: PASSWORD_MAX_LENGTH,
        autoSignIn: true, // log in right after signup
        // requireEmailVerification stays off: no email sending yet
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

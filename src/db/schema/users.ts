import {
    boolean,
    index,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
    "user",
    "admin",
]);

export const userTierEnum = pgEnum("user_tier", [
    "free",
    "premium",
]);

// Users table definition

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified")
        .notNull()
        .default(false),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    role: userRoleEnum("role")
        .notNull()
        .default("user"),
    tier: userTierEnum("tier")
        .notNull()
        .default("free"),
    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

// ai requests
export const aiRequests = pgTable(
    "ai_requests",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        endpoint: text("endpoint").notNull(),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("ai_requests_user_endpoint_created_idx").on(
            table.userId,
            table.endpoint,
            table.createdAt,
        ),
    ],
);

// OAuth / Authentication Accounts

export const accounts = pgTable(
    "accounts",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        providerId: text("provider_id").notNull(),
        // Mapped to Better Auth's `accountId` in src/auth.ts
        providerAccountId: text("provider_account_id").notNull(),

        // Better Auth: OAuth tokens (social providers)
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", {
            withTimezone: true,
        }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
            withTimezone: true,
        }),
        scope: text("scope"),
        // Better Auth: hashed password (email/password "credential" accounts only)
        password: text("password"),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    // Postgres doesn't index foreign keys automatically; Better Auth looks
    // up accounts by user.
    (table) => [index("accounts_user_id_idx").on(table.userId)],
);

// Sessions

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),

        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at", {
            withTimezone: true,
        }).notNull(),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
    },
    (table) => [index("sessions_user_id_idx").on(table.userId)],
);

// Verifications (Better Auth: email verification / password reset tokens).
// Plural name so the adapter's `usePlural: true` finds it. Not linked to a
// user, so no relations.

export const verifications = pgTable(
    "verifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at", {
            withTimezone: true,
        }).notNull(),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

// User Preferences

export const userPreferences = pgTable("user_preferences", {
    id: uuid("id").primaryKey().defaultRandom(),

    userId: uuid("user_id")
        .notNull()
        .unique()
        .references(() => users.id, {
            onDelete: "cascade",
        }),
    theme: text("theme")
        .notNull()
        .default("system"),
    notifications: boolean("notifications")
        .notNull()
        .default(true),

    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});


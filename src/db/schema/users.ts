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

export const accounts = pgTable("accounts", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {
            onDelete: "cascade",
        }),
    providerId: text("provider_id").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
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

// Sessions

export const sessions = pgTable("sessions", {
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
});

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


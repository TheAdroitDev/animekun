import { relations } from "drizzle-orm";

import { accounts, aiUsage, sessions, userPreferences, userRoleEnum, userTierEnum, users, verifications, } from "./users";
import { bookmarkStatusEnum, bookmarks, } from "./bookmarks";
import { achievements, quizSessions, } from "./quiz";
import { chatMessages, notifications, } from "./chat";
import { feedback } from "./feedback";

// Enums must be exported here too: drizzle-kit only sees what this file
// exports, and would otherwise try to DROP enums that exist in the database.
export { userRoleEnum, userTierEnum, bookmarkStatusEnum, users, accounts, sessions, verifications, userPreferences, bookmarks, quizSessions, achievements, chatMessages, notifications, aiUsage, feedback }


export const usersRelations = relations(users, ({ many, one }) => ({
    accounts: many(accounts),
    sessions: many(sessions),
    preferences: one(userPreferences),
    bookmarks: many(bookmarks),
    quizSessions: many(quizSessions),
    achievements: many(achievements),
    sentMessages: many(chatMessages, { // important distinction in foreign keys
        relationName: "sender",
    }),
    receivedMessages: many(chatMessages, {
        relationName: "receiver",
    }),
    notifications: many(notifications),
}));

// An account belongs to one user:
export const accountsRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

// A session also belongs to one user:
export const sessionsRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

// One preferences record belongs to one user:
export const userPreferencesRelations = relations(
    userPreferences,
    ({ one }) => ({
        user: one(users, {
            fields: [userPreferences.userId],
            references: [users.id],
        }),
    }),
);

// Each bookmark belongs to one user:
export const bookmarksRelations = relations(
    bookmarks,
    ({ one }) => ({
        user: one(users, {
            fields: [bookmarks.userId],
            references: [users.id],
        }),
    }),
);

// A quiz game belongs to one user:
export const quizSessionsRelations = relations(
    quizSessions,
    ({ one }) => ({
        user: one(users, {
            fields: [quizSessions.userId],
            references: [users.id],
        }),
    }),
);

// And an achievement belongs to one user:
export const achievementsRelations = relations(
    achievements,
    ({ one }) => ({
        user: one(users, {
            fields: [achievements.userId],
            references: [users.id],
        }),
    }),
);

// chat relatotionhships
export const chatMessagesRelations = relations(
    chatMessages,
    ({ one }) => ({
        sender: one(users, {
            fields: [chatMessages.senderId],
            references: [users.id],
            relationName: "sender",
        }),

        receiver: one(users, {
            fields: [chatMessages.receiverId],
            references: [users.id],
            relationName: "receiver",
        }),
    }),
);

// notification relationships
export const notificationsRelations = relations(
    notifications,
    ({ one }) => ({
        user: one(users, {
            fields: [notifications.userId],
            references: [users.id],
        }),
    }),
);
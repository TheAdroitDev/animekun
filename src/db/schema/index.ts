import { relations } from "drizzle-orm";

import { accounts, aiRequests, sessions, userPreferences, users, } from "./users";
import { bookmarkBoards, bookmarks, } from "./bookmarks";
import { achievements, quizScores, } from "./quiz";
import { chatMessages, notifications, } from "./chat";

export { users, accounts, sessions, userPreferences, bookmarkBoards, bookmarks, quizScores, achievements, chatMessages, notifications, aiRequests }


export const usersRelations = relations(users, ({ many, one }) => ({
    accounts: many(accounts),
    sessions: many(sessions),
    preferences: one(userPreferences),
    bookmarkBoards: many(bookmarkBoards),
    quizScores: many(quizScores),
    achievements: many(achievements),
    aiRequests: many(aiRequests),
    sentMessages: many(chatMessages, { // important distinction in foreign keys
        relationName: "sender",
    }),
    receivedMessages: many(chatMessages, {
        relationName: "receiver",
    }),
    notifications: many(notifications),
}));

export const aiRequestsRelations = relations(
    aiRequests,
    ({ one }) => ({
        user: one(users, {
            fields: [aiRequests.userId],
            references: [users.id],
        }),
    }),
);

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

// A board belongs to one user and contains many bookmarks:
export const bookmarkBoardsRelations = relations(
    bookmarkBoards,
    ({ one, many }) => ({
        user: one(users, {
            fields: [bookmarkBoards.userId],
            references: [users.id],
        }),

        bookmarks: many(bookmarks),
    }),
);

// And each bookmark belongs to one board:
export const bookmarksRelations = relations(
    bookmarks,
    ({ one }) => ({
        board: one(bookmarkBoards, {
            fields: [bookmarks.boardId],
            references: [bookmarkBoards.id],
        }),
    }),
);

// A quiz score belongs to one user:
export const quizScoresRelations = relations(
    quizScores,
    ({ one }) => ({
        user: one(users, {
            fields: [quizScores.userId],
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
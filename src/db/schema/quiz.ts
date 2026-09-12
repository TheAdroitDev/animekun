import {
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

export const quizScores = pgTable("quiz_scores", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {
            onDelete: "cascade",
        }),
    mode: text("mode").notNull(),
    difficulty: text("difficulty").notNull(),
    score: integer("score").notNull(),
    correctCount: integer("correct_count").notNull(),
    totalCount: integer("total_count").notNull(),
    streak: integer("streak").notNull().default(0),
    playedAt: timestamp("played_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});


export const achievements = pgTable("achievements", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {
            onDelete: "cascade",
        }),
    type: text("type").notNull(),
    unlockedAt: timestamp("unlocked_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});
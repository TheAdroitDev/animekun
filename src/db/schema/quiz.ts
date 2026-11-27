import { sql } from "drizzle-orm";
import {
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

// Relative path: drizzle-kit loads schema files without the "@/" alias.
import type { StoredAnswer, StoredQuestion } from "../../modules/quiz/types";
import { users } from "./users";

/**
 * One row per quiz game (Phase 9). Holds the questions with their answers
 * (server-only: never sent to the browser before the user answers) and the
 * running score. A finished game (finished_at set) is the saved score: the
 * leaderboard sums these, so there is no separate scores table.
 *
 * Every answer is one UPDATE guarded by current_index (neon-http has no
 * transactions), so a double tap or a replayed request changes nothing.
 */
export const quizSessions = pgTable(
    "quiz_sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        mode: text("mode").notNull(),
        difficulty: text("difficulty").notNull(),
        // Copied from the difficulty at start, so the answer UPDATE needs
        // no lookup.
        timeLimitSeconds: integer("time_limit_seconds").notNull(),
        pointsPerCorrect: integer("points_per_correct").notNull(),
        questions: jsonb("questions").$type<StoredQuestion[]>().notNull(),
        answers: jsonb("answers")
            .$type<StoredAnswer[]>()
            .notNull()
            .default(sql`'[]'::jsonb`),
        // The next question to answer, and when it was sent: the server
        // checks the time limit, not the browser's timer.
        currentIndex: integer("current_index").notNull().default(0),
        questionServedAt: timestamp("question_served_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        score: integer("score").notNull().default(0),
        correctCount: integer("correct_count").notNull().default(0),
        streak: integer("streak").notNull().default(0),
        bestStreak: integer("best_streak").notNull().default(0),
        // Lifelines used in this game ("fifty", "hint", "skip"): each once.
        lifelinesUsed: text("lifelines_used")
            .array()
            .notNull()
            .default(sql`'{}'::text[]`),
        startedAt: timestamp("started_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        finishedAt: timestamp("finished_at", {
            withTimezone: true,
        }),
    },
    (table) => [
        index("quiz_sessions_user_started_idx").on(table.userId, table.startedAt),
        index("quiz_sessions_finished_idx").on(table.finishedAt),
    ],
);

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

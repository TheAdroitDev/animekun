import { sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db";

import type { Difficulty, QuizMode, UserQuizStats } from "../types";

/**
 * Quiz leaderboard (step 9.9). Server-only. A finished quiz_sessions row is
 * a saved score, so the boards are plain aggregates over those rows (the
 * finished_at index). Boards are cached for 5 minutes and shared by every
 * visitor; a player's own stats are one small live query.
 */

export type LeaderboardPeriod = "week" | "all";

const BOARD_SIZE = 50;
const BOARD_REVALIDATE_SECONDS = 300;

export interface LeaderboardRow {
    userId: string;
    /** "First L." (never the full name or email). */
    name: string;
    total: number;
    games: number;
    /** 0–1: correct answers ÷ questions answered. */
    accuracy: number;
}

// Monday 00:00 UTC of the current week, as a timestamptz.
const WEEK_START = sql`(date_trunc('week', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc')`;

type BoardRow = {
    user_id: string;
    name: string;
    total: number;
    games: number;
    correct: number;
    answered: number;
};

async function queryBoard(period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
    const since = period === "week" ? sql`AND s.finished_at >= ${WEEK_START}` : sql``;

    const result = await db.execute<BoardRow>(sql`
        SELECT
            s.user_id,
            u.name,
            sum(s.score)::int AS total,
            count(*)::int AS games,
            sum(s.correct_count)::int AS correct,
            sum(jsonb_array_length(s.answers))::int AS answered
        FROM quiz_sessions AS s
        JOIN users AS u ON u.id = s.user_id
        WHERE s.finished_at IS NOT NULL ${since}
        GROUP BY s.user_id, u.name
        ORDER BY
            total DESC,
            sum(s.correct_count)::float / NULLIF(sum(jsonb_array_length(s.answers)), 0) DESC NULLS LAST
        LIMIT ${BOARD_SIZE}
    `);

    return result.rows.map((row) => ({
        userId: row.user_id,
        name: shortName(row.name),
        total: Number(row.total),
        games: Number(row.games),
        accuracy: row.answered > 0 ? Number(row.correct) / Number(row.answered) : 0,
    }));
}

const cachedBoards: Record<LeaderboardPeriod, () => Promise<LeaderboardRow[]>> = {
    week: unstable_cache(() => queryBoard("week"), ["quiz-leaderboard-week-v1"], {
        revalidate: BOARD_REVALIDATE_SECONDS,
        tags: ["quiz-leaderboard"],
    }),
    all: unstable_cache(() => queryBoard("all"), ["quiz-leaderboard-all-v1"], {
        revalidate: BOARD_REVALIDATE_SECONDS,
        tags: ["quiz-leaderboard"],
    }),
};

/** The top 50 for this week or all time (cached for 5 minutes). */
export function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
    return cachedBoards[period]();
}

type StatsRow = {
    games: number;
    total: number;
    week_total: number;
    correct: number;
    answered: number;
    best_streak: number;
    best_game: { score: number; mode: QuizMode; difficulty: Difficulty } | null;
};

/** One player's live numbers (one SELECT on the user_id index). */
export async function getUserQuizStats(userId: string): Promise<UserQuizStats> {
    const result = await db.execute<StatsRow>(sql`
        SELECT
            count(*)::int AS games,
            COALESCE(sum(score), 0)::int AS total,
            COALESCE(sum(score) FILTER (WHERE finished_at >= ${WEEK_START}), 0)::int AS week_total,
            COALESCE(sum(correct_count), 0)::int AS correct,
            COALESCE(sum(jsonb_array_length(answers)), 0)::int AS answered,
            COALESCE(max(best_streak), 0)::int AS best_streak,
            (
                SELECT jsonb_build_object('score', b.score, 'mode', b.mode, 'difficulty', b.difficulty)
                FROM quiz_sessions AS b
                WHERE b.user_id = ${userId}::uuid AND b.finished_at IS NOT NULL
                ORDER BY b.score DESC, b.finished_at
                LIMIT 1
            ) AS best_game
        FROM quiz_sessions
        WHERE user_id = ${userId}::uuid AND finished_at IS NOT NULL
    `);

    const row = result.rows[0];
    const answered = Number(row?.answered ?? 0);
    return {
        games: Number(row?.games ?? 0),
        total: Number(row?.total ?? 0),
        weekTotal: Number(row?.week_total ?? 0),
        accuracy: answered > 0 ? Number(row?.correct ?? 0) / answered : 0,
        bestStreak: Number(row?.best_streak ?? 0),
        bestGame: row?.best_game ?? null,
    };
}

/** "Racken Baik" → "Racken B.", "Naruto" → "Naruto". Max 24 characters. */
function shortName(fullName: string): string {
    const words = fullName.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return "Anonymous";
    const first = words[0];
    const last = words.length > 1 ? ` ${Array.from(words[words.length - 1])[0]}.` : "";
    return `${Array.from(first).slice(0, 20).join("")}${last}`;
}

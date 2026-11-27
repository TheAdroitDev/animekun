import { sql } from "drizzle-orm";

import { db } from "@/db";
import { quizSessions } from "@/db/schema";

import {
    ANSWER_SLACK_SECONDS,
    POINTS_PER_CORRECT,
    REVEAL_SECONDS,
    TIME_LIMIT_SECONDS,
} from "../constants";
import type {
    AnswerResult,
    Difficulty,
    QuizMode,
    QuizOption,
    QuizQuestion,
    StartQuizResult,
    StoredQuestion,
} from "../types";
import { generateQuestions } from "./question-generator";
import { getQuizPool } from "./question-pool";

/**
 * Quiz games on the server (step 9.3). Server-only: call from route
 * handlers with the user id from the session, never from the client.
 * Each call is one database statement (neon-http has no transactions).
 */

/** Creates a game (one INSERT) and returns its first question. */
export async function startQuiz(
    userId: string,
    mode: QuizMode,
    difficulty: Difficulty,
): Promise<StartQuizResult> {
    const pool = await getQuizPool();
    const questions = generateQuestions(pool, mode, difficulty);
    const timeLimitSeconds = TIME_LIMIT_SECONDS[difficulty];

    // question_served_at defaults to now(): the first question's clock starts here.
    const [row] = await db
        .insert(quizSessions)
        .values({
            userId,
            mode,
            difficulty,
            timeLimitSeconds,
            pointsPerCorrect: POINTS_PER_CORRECT[difficulty],
            questions,
        })
        .returning({ id: quizSessions.id });

    return {
        sessionId: row.id,
        total: questions.length,
        question: toClientQuestion(questions[0], 0, mode, timeLimitSeconds),
    };
}

type AnswerRow = {
    correct: boolean;
    in_time: boolean;
    correct_id: string;
    score: number;
    correct_count: number;
    streak: number;
    best_streak: number;
    current_index: number;
    total: number;
    mode: QuizMode;
    time_limit_seconds: number;
    next_question: Omit<StoredQuestion, "animeId"> | null;
    finished: boolean;
    duration_ms: number | null;
};

/**
 * Answers the current question in one UPDATE: it checks the answer and the
 * server-side time limit, updates score and streak, moves to the next
 * question (restarting its clock) and closes the game after the last one.
 *
 * Returns null when nothing matched: not this user's game, already
 * finished, or that question was already answered (double tap, replay).
 */
export async function answerQuestion(
    userId: string,
    sessionId: string,
    index: number,
    optionId: string | null,
): Promise<AnswerResult | null> {
    const result = await db.execute<AnswerRow>(sql`
        WITH cur AS (
            SELECT
                id,
                questions -> current_index ->> 'animeId' AS correct_id,
                now() - question_served_at
                    <= make_interval(secs => time_limit_seconds + ${ANSWER_SLACK_SECONDS}::int) AS in_time,
                -- Negative when "Next" skipped the reveal early: count it as 0.
                GREATEST(0, LEAST(floor(extract(epoch FROM now() - question_served_at) * 1000), 2147483647))::int AS ms,
                jsonb_array_length(questions) AS total
            FROM quiz_sessions
            WHERE id = ${sessionId}::uuid
              AND user_id = ${userId}::uuid
              AND current_index = ${index}::int
              AND finished_at IS NULL
        ),
        judged AS (
            SELECT cur.*, (COALESCE(cur.correct_id = ${optionId}::text, false) AND cur.in_time) AS ok
            FROM cur
        )
        UPDATE quiz_sessions AS s SET
            answers = s.answers || jsonb_build_array(
                jsonb_build_object('optionId', ${optionId}::text, 'correct', j.ok, 'ms', j.ms)
            ),
            score = s.score + CASE WHEN j.ok THEN s.points_per_correct ELSE 0 END,
            correct_count = s.correct_count + j.ok::int,
            streak = CASE WHEN j.ok THEN s.streak + 1 ELSE 0 END,
            best_streak = GREATEST(s.best_streak, CASE WHEN j.ok THEN s.streak + 1 ELSE 0 END),
            current_index = s.current_index + 1,
            -- The next question appears after the reveal: start its clock then.
            question_served_at = now() + make_interval(secs => ${REVEAL_SECONDS}::int),
            finished_at = CASE WHEN s.current_index + 1 >= j.total THEN now() ELSE NULL END
        FROM judged AS j
        WHERE s.id = j.id
          AND s.current_index = ${index}::int
          AND s.finished_at IS NULL
        RETURNING
            j.ok AS correct,
            j.in_time,
            j.correct_id,
            s.score,
            s.correct_count,
            s.streak,
            s.best_streak,
            s.current_index,
            j.total,
            s.mode,
            s.time_limit_seconds,
            (s.questions -> s.current_index) - 'animeId' AS next_question,
            s.finished_at IS NOT NULL AS finished,
            floor(extract(epoch FROM s.finished_at - s.started_at) * 1000)::int AS duration_ms
    `);

    const row = result.rows[0];
    if (!row) return null;

    const next =
        !row.finished && row.next_question
            ? toClientQuestion(row.next_question, row.current_index, row.mode, row.time_limit_seconds)
            : null;

    return {
        correct: row.correct,
        timedOut: optionId === null || !row.in_time,
        correctId: row.correct_id,
        score: row.score,
        streak: row.streak,
        next,
        results: row.finished
            ? {
                  score: row.score,
                  correctCount: row.correct_count,
                  total: row.total,
                  bestStreak: row.best_streak,
                  durationMs: row.duration_ms ?? 0,
              }
            : null,
    };
}

/** What the browser may see: everything except the answer. */
function toClientQuestion(
    question: { prompt: string; options: QuizOption[] },
    index: number,
    mode: QuizMode,
    timeLimitSeconds: number,
): QuizQuestion {
    return {
        index,
        mode,
        prompt: question.prompt,
        options: question.options,
        timeLimitSeconds,
    };
}

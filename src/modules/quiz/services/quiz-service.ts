import { sql } from "drizzle-orm";

import { db } from "@/db";
import { quizSessions } from "@/db/schema";

import {
    ANSWER_SLACK_SECONDS,
    LIFELINE_PAUSE_SECONDS,
    POINTS_PER_CORRECT,
    REVEAL_SECONDS,
    TIME_LIMIT_SECONDS,
} from "../constants";
import type {
    AnswerResult,
    Difficulty,
    LifelineResult,
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
    skipped: boolean;
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
    next_question: Pick<StoredQuestion, "prompt" | "options"> | null;
    finished: boolean;
    duration_ms: number | null;
};

/**
 * Answers the current question in one UPDATE: it checks the answer and the
 * server-side time limit, updates score and streak, moves to the next
 * question (restarting its clock) and closes the game after the last one.
 *
 * `skip` (lifeline, 9.7): no points, the streak is kept, once per game.
 * A skip sent after the time limit counts as a normal timeout and doesn't
 * use the lifeline.
 *
 * Returns null when nothing matched: not this user's game, already
 * finished, that question was already answered (double tap, replay), or
 * Skip was already used.
 */
export async function answerQuestion(
    userId: string,
    sessionId: string,
    index: number,
    optionId: string | null,
    skip = false,
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
              AND NOT (${skip}::boolean AND 'skip' = ANY(lifelines_used))
        ),
        judged AS (
            SELECT
                cur.*,
                (NOT ${skip}::boolean AND COALESCE(cur.correct_id = ${optionId}::text, false) AND cur.in_time) AS ok,
                (${skip}::boolean AND cur.in_time) AS skipped
            FROM cur
        )
        UPDATE quiz_sessions AS s SET
            answers = s.answers || jsonb_build_array(
                jsonb_build_object('optionId', ${optionId}::text, 'correct', j.ok, 'ms', j.ms, 'skipped', j.skipped)
            ),
            score = s.score + CASE WHEN j.ok THEN s.points_per_correct ELSE 0 END,
            correct_count = s.correct_count + j.ok::int,
            -- A skip keeps the streak; a wrong answer or timeout resets it.
            streak = CASE WHEN j.ok THEN s.streak + 1 WHEN j.skipped THEN s.streak ELSE 0 END,
            best_streak = GREATEST(s.best_streak, CASE WHEN j.ok THEN s.streak + 1 ELSE 0 END),
            lifelines_used = CASE
                WHEN j.skipped THEN array_append(s.lifelines_used, 'skip')
                ELSE s.lifelines_used
            END,
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
            j.skipped,
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
            -- Only what the browser may see (no answer, no lifeline data).
            jsonb_build_object(
                'prompt', s.questions -> s.current_index -> 'prompt',
                'options', s.questions -> s.current_index -> 'options'
            ) AS next_question,
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
        timedOut: !row.in_time || (optionId === null && !skip),
        skipped: row.skipped,
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

type LifelineRow = { remove_ids: string[]; hint: string };

/**
 * Uses the 50/50 or Hint lifeline on the current question (9.7), in one
 * UPDATE: marks it used and returns only that question's lifeline data
 * (prepared when the game was created). Returns null when nothing matched:
 * not this user's game, finished, not on that question, already used, or a
 * game created before lifelines existed (no data stored).
 */
export async function applyLifeline(
    userId: string,
    sessionId: string,
    index: number,
    type: "fifty" | "hint",
): Promise<LifelineResult | null> {
    const result = await db.execute<LifelineRow>(sql`
        UPDATE quiz_sessions
        SET lifelines_used = array_append(lifelines_used, ${type}::text),
            -- The timer pauses while this loads: give that time back.
            question_served_at = question_served_at + make_interval(secs => ${LIFELINE_PAUSE_SECONDS}::int)
        WHERE id = ${sessionId}::uuid
          AND user_id = ${userId}::uuid
          AND current_index = ${index}::int
          AND finished_at IS NULL
          AND NOT (${type}::text = ANY(lifelines_used))
          AND (questions -> current_index) ? 'hint'
        RETURNING
            questions -> current_index -> 'removeIds' AS remove_ids,
            questions -> current_index ->> 'hint' AS hint
    `);

    const row = result.rows[0];
    if (!row) return null;
    return type === "fifty"
        ? { type, removedIds: row.remove_ids }
        : { type, hint: row.hint };
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

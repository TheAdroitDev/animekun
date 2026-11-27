import { OPTIONS_PER_QUESTION, QUESTIONS_PER_GAME } from "../constants";
import type { Difficulty, PoolAnime, QuizMode, StoredQuestion } from "../types";

/**
 * Builds one game's questions from the cached pool (step 9.2). Pure: no
 * Tenrai, no database. Server-only, because the result holds the answers.
 *
 * Difficulty picks the wrong options:
 * - easy: other genres where possible (obvious),
 * - medium: at least one shared genre,
 * - hard: the most similar anime (shared genres, then closest year).
 */
export function generateQuestions(
    pool: PoolAnime[],
    mode: QuizMode,
    difficulty: Difficulty,
    count: number = QUESTIONS_PER_GAME,
): StoredQuestion[] {
    if (pool.length < count + OPTIONS_PER_QUESTION - 1) {
        throw new Error(`Quiz pool too small for a game (${pool.length} anime)`);
    }

    return shuffle(pool)
        .slice(0, count)
        .map((answer) => {
            const wrong = pickDistractors(answer, pool, difficulty, OPTIONS_PER_QUESTION - 1);
            return {
                animeId: answer.id,
                prompt: mode === "synopsis" ? answer.synopsis : answer.posterUrl,
                options: shuffle([answer, ...wrong]).map((a) => ({ id: a.id, title: a.title })),
                // Lifeline data, only sent to the browser when used (9.7).
                hint: buildHint(answer),
                removeIds: shuffle(wrong)
                    .slice(0, 2)
                    .map((a) => a.id),
            };
        });
}

function pickDistractors(
    answer: PoolAnime,
    pool: PoolAnime[],
    difficulty: Difficulty,
    count: number,
): PoolAnime[] {
    const others = pool.filter((a) => a.id !== answer.id);
    const shared = (a: PoolAnime) => a.genres.filter((g) => answer.genres.includes(g)).length;

    if (difficulty === "hard") {
        // The 8 closest look-alikes, then 3 of those at random (variety
        // between games without making it easier).
        const yearGap = (a: PoolAnime) =>
            a.year && answer.year ? Math.abs(a.year - answer.year) : 50;
        const closest = [...others]
            .sort((a, b) => shared(b) - shared(a) || yearGap(a) - yearGap(b))
            .slice(0, 8);
        return shuffle(closest).slice(0, count);
    }

    const preferred = others.filter((a) =>
        difficulty === "easy" ? shared(a) === 0 : shared(a) > 0,
    );
    const picked = shuffle(preferred).slice(0, count);

    // Not enough in the preferred group: top up from the rest.
    if (picked.length < count) {
        const rest = shuffle(others.filter((a) => !picked.includes(a)));
        picked.push(...rest.slice(0, count - picked.length));
    }
    return picked;
}

/** "Action · Fantasy · aired 2011" (up to 3 genres, then the year). */
function buildHint(anime: PoolAnime): string {
    const parts = anime.genres.slice(0, 3);
    if (anime.year) parts.push(`aired ${anime.year}`);
    return parts.length > 0 ? parts.join(" · ") : "No clue for this one, sorry!";
}

/** Fisher–Yates on a copy. */
function shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

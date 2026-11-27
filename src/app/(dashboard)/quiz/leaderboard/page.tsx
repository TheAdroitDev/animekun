import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/route";
import { Leaderboard, type BoardEntry } from "@/modules/quiz/components/Leaderboard";
import {
    getLeaderboard,
    getUserQuizStats,
    type LeaderboardRow,
} from "@/modules/quiz/services/leaderboard";

// Private page: dynamic (reads the session), never indexed.
export const metadata: Metadata = {
    title: "Quiz Leaderboard | AnimeKun",
    robots: { index: false, follow: false },
};

export default async function QuizLeaderboardPage() {
    // The real check (the proxy only looks for a cookie). User id from the session.
    const session = await requireSession(ROUTES.DASHBOARD.QUIZ_LEADERBOARD);
    const userId = session.user.id;

    // Boards come from the 5-minute cache; the player's stats are live.
    const [week, all, stats] = await Promise.all([
        getLeaderboard("week").catch(() => null),
        getLeaderboard("all").catch(() => null),
        getUserQuizStats(userId).catch(() => null),
    ]);

    // Only names and numbers reach the browser, never other players' ids.
    const toEntries = (rows: LeaderboardRow[] | null): BoardEntry[] | null =>
        rows?.map((row, i) => ({
            rank: i + 1,
            name: row.name,
            total: row.total,
            games: row.games,
            accuracy: row.accuracy,
            isYou: row.userId === userId,
        })) ?? null;

    return (
        <div className="quiz-play-page">
            <header className="quiz-play-header">
                <span className="quiz-play-icon" aria-hidden="true">
                    <Trophy size={20} />
                </span>
                <div>
                    <h1 className="quiz-play-title">Quiz Leaderboard</h1>
                    <p className="quiz-play-subtitle">
                        Total points from finished quizzes. Updates every 5 minutes.
                    </p>
                </div>
            </header>

            <Leaderboard week={toEntries(week)} all={toEntries(all)} stats={stats} />

            <Link href={ROUTES.DASHBOARD.QUIZ} prefetch={false} className="quiz-results-secondary quiz-board-back">
                <ArrowLeft size={16} aria-hidden="true" />
                <span>Back to the quiz</span>
            </Link>
        </div>
    );
}

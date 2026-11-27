import type { Metadata } from "next";
import { Brain } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/route";
import { getDailyRemaining } from "@/lib/utils/rate-limit";
import { QuizGame } from "@/modules/quiz/components/QuizGame";
import { QUIZ_DAILY_LIMITS, QUIZ_ENDPOINT } from "@/modules/quiz/constants";

// Private page: dynamic (reads the session), never indexed.
export const metadata: Metadata = {
    title: "Anime Quiz | AnimeKun",
    robots: { index: false, follow: false },
};

export default async function QuizPage() {
    // The real check (the proxy only looks for a cookie). User id from the session.
    const session = await requireSession(ROUTES.DASHBOARD.QUIZ);

    const remaining = await getDailyRemaining(
        session.user.id,
        QUIZ_ENDPOINT,
        QUIZ_DAILY_LIMITS.perUser,
    ).catch(() => QUIZ_DAILY_LIMITS.perUser); // the start route still enforces the real limit

    return (
        <div className="quiz-play-page">
            <header className="quiz-play-header">
                <span className="quiz-play-icon" aria-hidden="true">
                    <Brain size={20} />
                </span>
                <div>
                    <h1 className="quiz-play-title">Anime Quiz</h1>
                    <p className="quiz-play-subtitle">
                        10 questions from the most popular anime. Pick a mode and how fast you are.
                    </p>
                </div>
            </header>

            <QuizGame initialRemaining={remaining} dailyLimit={QUIZ_DAILY_LIMITS.perUser} />
        </div>
    );
}

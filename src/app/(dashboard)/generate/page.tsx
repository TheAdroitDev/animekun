import type { Metadata } from "next";
import { Sparkles } from "lucide-react";

import { requireSession } from "@/lib/auth/session";
import { GENRES } from "@/lib/constants/genres";
import { ROUTES } from "@/lib/constants/route";
import { getDailyRemaining } from "@/lib/utils/rate-limit";
import { GenerateForm } from "@/modules/generate/components/GenerateForm";
import { GENERATE_DAILY_LIMITS, GENERATE_ENDPOINT } from "@/modules/generate/constants";
import { PROMPT_MAX_LENGTH } from "@/modules/generate/validations/generate-schema";

// Private page: dynamic (reads the session), never indexed.
export const metadata: Metadata = {
    title: "AI Anime Finder | AnimeKun",
    robots: { index: false, follow: false },
};

interface GeneratePageProps {
    searchParams: Promise<{ q?: string | string[]; genres?: string | string[] }>;
}

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * The home page's Generate section links here with ?q=<vibe>&genres=<slugs>.
 * Turn that into the starting prompt; unknown genre slugs are ignored.
 */
function buildInitialPrompt(q: string, genres: string): string {
    const names = genres
        .split(",")
        .map((slug) => GENRES.find((g) => g.slug === slug.trim())?.name)
        .filter((name): name is (typeof GENRES)[number]["name"] => Boolean(name));

    const parts = [q.trim(), names.length > 0 ? `Genres: ${names.join(", ")}` : ""].filter(Boolean);
    return parts.join(". ").slice(0, PROMPT_MAX_LENGTH);
}

export default async function GeneratePage({ searchParams }: GeneratePageProps) {
    // The real check (the proxy only looks for a cookie). User id from the session.
    const session = await requireSession(ROUTES.DASHBOARD.GENERATE);
    const { q, genres } = await searchParams;

    const remaining = await getDailyRemaining(
        session.user.id,
        GENERATE_ENDPOINT,
        GENERATE_DAILY_LIMITS.perUser,
    ).catch(() => GENERATE_DAILY_LIMITS.perUser); // the route still enforces the real limit

    return (
        <div className="gen-page">
            <header className="gen-page-header">
                <span className="gen-page-icon" aria-hidden="true">
                    <Sparkles size={20} />
                </span>
                <div>
                    <h1 className="gen-page-title">AI Anime Finder</h1>
                    <p className="gen-page-subtitle">
                        Describe what you feel like watching. The AI suggests up to 5 anime that match.
                    </p>
                </div>
            </header>

            <GenerateForm
                initialPrompt={buildInitialPrompt(first(q), first(genres))}
                initialRemaining={remaining}
                dailyLimit={GENERATE_DAILY_LIMITS.perUser}
            />

            <p className="gen-page-privacy">
                Your prompt is sent to Google Gemini, which may use it to improve Google&apos;s products.
                Don&apos;t include personal information.
            </p>
        </div>
    );
}

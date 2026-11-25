import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { count, countDistinct, desc, gt, sql } from "drizzle-orm";
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Bookmark,
    Database,
    LineChart,
    MessageSquareText,
    Triangle,
    UserPlus,
    Users,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/db";
import { bookmarks, feedback, sessions, users } from "@/db/schema";
import { getEnv } from "@/lib/config/env";
import { BOOKMARK_STATUSES, BOOKMARK_STATUS_LABELS } from "@/modules/bookmarks/types";
import { GENERATE_DAILY_LIMITS, GENERATE_ENDPOINT } from "@/modules/generate/constants";
import { GEMINI_MODEL } from "@/modules/generate/services/ai-service";

// Private page: dynamic (reads the session), never indexed.
// Anyone who isn't ADMIN_EMAIL gets a plain 404, so the page stays hidden.
export const metadata: Metadata = {
    title: "Admin | AnimeKun",
    robots: { index: false, follow: false },
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Request/traffic numbers live in these dashboards (we never log requests
// ourselves: that would cost a function run + DB write per visit).
const LINKS = [
    {
        label: "Vercel",
        hint: "Requests, functions, usage limits",
        href: "https://vercel.com/the-adroit-devs-projects/animekun",
        icon: Triangle,
    },
    {
        label: "Umami",
        hint: "Visitors, pageviews, referrers",
        href: "https://cloud.umami.is/analytics/us/websites",
        icon: BarChart3,
    },
    {
        label: "Neon",
        hint: "Database tables & storage",
        href: "https://console.neon.tech/app/projects/bold-dawn-49640110/branches/br-misty-cherry-aud2hg6q/tables",
        icon: Database,
    },
    {
        label: "Tracwell",
        hint: "Product analytics & events",
        href: "https://tracwell.app/app",
        icon: LineChart,
    },
];

// AI Finder usage from the ai_usage counters (UTC days, like the limits).
// Counts answered requests only: failed Gemini calls are refunded, so
// Google's own count (AI Studio) can be a little higher.
type AiUsageRow = { today: number; users_today: number; last7: number };

async function getAiUsage(): Promise<AiUsageRow> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await db.execute<AiUsageRow>(sql`
        SELECT
            COALESCE(SUM(count) FILTER (WHERE key = 'global' AND day = ${today}::date), 0)::int AS today,
            COUNT(*) FILTER (WHERE key LIKE 'user:%' AND day = ${today}::date AND count > 0)::int AS users_today,
            COALESCE(SUM(count) FILTER (WHERE key = 'global'), 0)::int AS last7
        FROM ai_usage
        WHERE endpoint = ${GENERATE_ENDPOINT} AND day >= ${today}::date - 6
    `);
    const row = result.rows[0];
    return {
        today: Number(row?.today ?? 0),
        users_today: Number(row?.users_today ?? 0),
        last7: Number(row?.last7 ?? 0),
    };
}

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function getAdminStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const dayAgo = new Date(now.getTime() - DAY_MS);

    const [
        [total],
        [newThisWeek],
        [signedIn],
        [active24h],
        [bookmarkTotal],
        [bookmarksThisWeek],
        byStatus,
        [feedbackTotal],
        latest,
        aiUsage,
    ] = await Promise.all([
        db.select({ n: count() }).from(users),
        db.select({ n: count() }).from(users).where(gt(users.createdAt, weekAgo)),
        db.select({ n: countDistinct(sessions.userId) }).from(sessions).where(gt(sessions.expiresAt, now)),
        // Approximate "active today": Better Auth sets updated_at when a session
        // is created and when it refreshes (at most once a day per session), so
        // this counts users who signed in or came back in the last 24h. A visit
        // within a day of the last refresh doesn't move it. No request logging.
        db.select({ n: countDistinct(sessions.userId) }).from(sessions).where(gt(sessions.updatedAt, dayAgo)),
        db.select({ n: count() }).from(bookmarks),
        db.select({ n: count() }).from(bookmarks).where(gt(bookmarks.addedAt, weekAgo)),
        db.select({ status: bookmarks.status, n: count() }).from(bookmarks).groupBy(bookmarks.status),
        db.select({ n: count() }).from(feedback),
        db
            .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(6),
        getAiUsage(),
    ]);

    // Every column, in board order, even when it has no bookmarks yet.
    const statusCounts = new Map(byStatus.map((row) => [row.status, row.n]));

    return {
        today: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        stats: [
            { label: "Total users", value: total.n, hint: `+${newThisWeek.n} this week`, icon: Users },
            { label: "New this week", value: newThisWeek.n, hint: "Last 7 days", icon: UserPlus },
            { label: "Active (24h)", value: active24h.n, hint: "Signed in or returned", icon: Activity },
            { label: "Signed in", value: signedIn.n, hint: "Active sessions", icon: Users },
            { label: "Bookmarks", value: bookmarkTotal.n, hint: `+${bookmarksThisWeek.n} this week`, icon: Bookmark },
            { label: "Feedback", value: feedbackTotal.n, hint: "Widget responses", icon: MessageSquareText },
        ],
        bookmarkStatuses: BOOKMARK_STATUSES.map((status) => ({
            status,
            label: BOOKMARK_STATUS_LABELS[status],
            n: statusCounts.get(status) ?? 0,
        })),
        aiUsage: [
            { label: "Today", value: `${aiUsage.today} / ${GENERATE_DAILY_LIMITS.global}` },
            { label: "Users today", value: String(aiUsage.users_today) },
            { label: "Last 7 days", value: String(aiUsage.last7) },
            { label: "Model", value: GEMINI_MODEL },
        ],
        latest: latest.map((u) => ({ ...u, isNew: u.createdAt > dayAgo })),
    };
}

export default async function AdminPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
    if (!session || !adminEmail || session.user.email.toLowerCase() !== adminEmail) notFound();

    const { today, stats, bookmarkStatuses, aiUsage, latest } = await getAdminStats();
    const firstName = session.user.name.split(" ")[0];

    return (
        <div className="admin">
            {/* Banner */}
            <header className="admin-banner">
                <span className="admin-banner-kanji" aria-hidden="true">管理</span>
                {session.user.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="" className="admin-banner-avatar" referrerPolicy="no-referrer" />
                )}
                <div className="admin-banner-text">
                    <span className="admin-live">
                        <span className="status-dot status-dot--airing" /> Live · {today}
                    </span>
                    <h1 className="admin-title">
                        Okaeri, <span className="hero-accent-text">{firstName}-senpai</span> ✌🏻
                    </h1>
                    <p className="admin-subtitle">Here&apos;s how AnimeKun is doing today.</p>
                </div>
            </header>

            {/* Stats */}
            <div className="admin-stats">
                {stats.map(({ label, value, hint, icon: Icon }) => (
                    <div key={label} className="admin-stat">
                        <span className="admin-stat-icon">
                            <Icon size={18} />
                        </span>
                        <span className="admin-stat-value">{value.toLocaleString("en-US")}</span>
                        <span className="admin-stat-label">{label}</span>
                        <span className="admin-stat-hint">{hint}</span>
                    </div>
                ))}
            </div>

            <div className="admin-grid">
                {/* Latest sign-ups */}
                <section className="admin-card" aria-labelledby="admin-latest">
                    <h2 id="admin-latest" className="admin-card-title">Latest sign-ups</h2>
                    {latest.length === 0 ? (
                        <p className="admin-empty">No users yet. Your first fan is on the way!</p>
                    ) : (
                        <ul className="admin-users">
                            {latest.map((u) => (
                                <li key={u.id} className="admin-user">
                                    {u.avatarUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={u.avatarUrl} alt="" className="admin-avatar" referrerPolicy="no-referrer" />
                                    ) : (
                                        <span className="admin-avatar admin-avatar--fallback">{u.name.charAt(0)}</span>
                                    )}
                                    <span className="admin-user-info">
                                        <span className="admin-user-name">
                                            {u.name}
                                            {u.isNew && <span className="admin-new">New</span>}
                                        </span>
                                        <span className="admin-user-email">{u.email}</span>
                                    </span>
                                    <time className="admin-user-date" dateTime={u.createdAt.toISOString()}>
                                        {formatDate(u.createdAt)}
                                    </time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <div className="admin-side">
                    {/* AI Finder usage (ai_usage counters) */}
                    <section className="admin-card" aria-labelledby="admin-ai">
                        <h2 id="admin-ai" className="admin-card-title">AI Finder usage</h2>
                        <ul className="admin-statuses">
                            {aiUsage.map(({ label, value }) => (
                                <li key={label} className="admin-status">
                                    <span className="admin-status-label">{label}</span>
                                    <span className="admin-status-count">{value}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="admin-card-hint">
                            UTC days (reset 05:30 IST). Failed calls are refunded, so AI Studio may show a little more.
                        </p>
                    </section>

                    {/* Bookmarks per Kanban column */}
                    <section className="admin-card" aria-labelledby="admin-bookmarks">
                        <h2 id="admin-bookmarks" className="admin-card-title">Bookmarks by status</h2>
                        <ul className="admin-statuses">
                            {bookmarkStatuses.map(({ status, label, n }) => (
                                <li key={status} className="admin-status">
                                    <span className="admin-status-label">{label}</span>
                                    <span className="admin-status-count">{n.toLocaleString("en-US")}</span>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {/* Dashboards */}
                    <section className="admin-card" aria-labelledby="admin-traffic">
                        <h2 id="admin-traffic" className="admin-card-title">Traffic &amp; requests</h2>
                        <div className="admin-links">
                            {LINKS.map(({ label, hint, href, icon: Icon }) => (
                                <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="admin-link">
                                    <span className="admin-link-icon">
                                        <Icon size={18} />
                                    </span>
                                    <span className="admin-link-text">
                                        <span className="admin-link-label">{label}</span>
                                        <span className="admin-link-hint">{hint}</span>
                                    </span>
                                    <ArrowUpRight size={16} className="admin-link-arrow" />
                                </a>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

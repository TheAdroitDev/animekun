import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { count, countDistinct, desc, gt } from "drizzle-orm";
import {
    Activity,
    ArrowUpRight,
    BarChart3,
    Database,
    MessageSquareText,
    Triangle,
    UserPlus,
    Users,
} from "lucide-react";

import { auth } from "@/auth";
import { db } from "@/db";
import { feedback, sessions, users } from "@/db/schema";
import { getEnv } from "@/lib/config/env";

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
];

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

async function getAdminStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const dayAgo = new Date(now.getTime() - DAY_MS);

    const [[total], [newThisWeek], [signedIn], [feedbackTotal], latest] = await Promise.all([
        db.select({ n: count() }).from(users),
        db.select({ n: count() }).from(users).where(gt(users.createdAt, weekAgo)),
        db.select({ n: countDistinct(sessions.userId) }).from(sessions).where(gt(sessions.expiresAt, now)),
        db.select({ n: count() }).from(feedback),
        db
            .select({ id: users.id, name: users.name, email: users.email, avatarUrl: users.avatarUrl, createdAt: users.createdAt })
            .from(users)
            .orderBy(desc(users.createdAt))
            .limit(6),
    ]);

    return {
        today: now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        stats: [
            { label: "Total users", value: total.n, hint: `+${newThisWeek.n} this week`, icon: Users },
            { label: "New this week", value: newThisWeek.n, hint: "Last 7 days", icon: UserPlus },
            { label: "Signed in", value: signedIn.n, hint: "Active sessions", icon: Activity },
            { label: "Feedback", value: feedbackTotal.n, hint: "Widget responses", icon: MessageSquareText },
        ],
        latest: latest.map((u) => ({ ...u, isNew: u.createdAt > dayAgo })),
    };
}

export default async function AdminPage() {
    const session = await auth.api.getSession({ headers: await headers() });
    const adminEmail = getEnv().ADMIN_EMAIL.toLowerCase();
    if (!session || !adminEmail || session.user.email.toLowerCase() !== adminEmail) notFound();

    const { today, stats, latest } = await getAdminStats();
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
    );
}

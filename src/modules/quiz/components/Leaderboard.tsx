"use client";

import { useRef, useState } from "react";

import type { UserQuizStats } from "../types";

export interface BoardEntry {
    rank: number;
    name: string;
    total: number;
    games: number;
    accuracy: number;
    isYou: boolean;
}

type TabId = "week" | "all" | "you";

const TABS: { id: TabId; label: string }[] = [
    { id: "week", label: "This week" },
    { id: "all", label: "All-time" },
    { id: "you", label: "Your stats" },
];

const MEDALS = ["🥇", "🥈", "🥉"];
const MODE_LABEL = { synopsis: "Synopsis", poster: "Poster" } as const;
const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

interface LeaderboardProps {
    /** null = couldn't load. */
    week: BoardEntry[] | null;
    all: BoardEntry[] | null;
    stats: UserQuizStats | null;
}

/**
 * Leaderboard tabs (9.9). All three panels arrive from the server in one
 * render, so switching tabs sends no request. ARIA tabs: arrow keys move.
 */
export function Leaderboard({ week, all, stats }: LeaderboardProps) {
    const [active, setActive] = useState<TabId>("week");
    const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ week: null, all: null, you: null });

    const onKeyDown = (event: React.KeyboardEvent) => {
        const i = TABS.findIndex((t) => t.id === active);
        let next = i;
        if (event.key === "ArrowRight") next = (i + 1) % TABS.length;
        else if (event.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = TABS.length - 1;
        else return;
        event.preventDefault();
        const id = TABS[next].id;
        setActive(id);
        tabRefs.current[id]?.focus();
    };

    return (
        <section className="quiz-play-card quiz-board">
            <div className="quiz-board-tabs" role="tablist" aria-label="Leaderboard" onKeyDown={onKeyDown}>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        ref={(el) => {
                            tabRefs.current[tab.id] = el;
                        }}
                        type="button"
                        role="tab"
                        id={`quiz-board-tab-${tab.id}`}
                        aria-selected={active === tab.id}
                        aria-controls={`quiz-board-panel-${tab.id}`}
                        tabIndex={active === tab.id ? 0 : -1}
                        className="quiz-board-tab"
                        onClick={() => setActive(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {TABS.map((tab) => (
                <div
                    key={tab.id}
                    role="tabpanel"
                    id={`quiz-board-panel-${tab.id}`}
                    aria-labelledby={`quiz-board-tab-${tab.id}`}
                    hidden={active !== tab.id}
                >
                    {tab.id === "you" ? (
                        <YourStats stats={stats} />
                    ) : (
                        <Board
                            entries={tab.id === "week" ? week : all}
                            yourTotal={tab.id === "week" ? stats?.weekTotal : stats?.total}
                            emptyText={
                                tab.id === "week"
                                    ? "No scores yet this week. Play a quiz to take the top spot!"
                                    : "No scores yet. Play a quiz to take the top spot!"
                            }
                            footnote={tab.id === "week" ? "Resets every Monday at 00:00 UTC." : null}
                        />
                    )}
                </div>
            ))}
        </section>
    );
}

function Board({
    entries,
    yourTotal,
    emptyText,
    footnote,
}: {
    entries: BoardEntry[] | null;
    yourTotal: number | undefined;
    emptyText: string;
    footnote: string | null;
}) {
    if (entries === null) {
        return <p className="quiz-play-error">Couldn&apos;t load the leaderboard. Please try again later.</p>;
    }
    if (entries.length === 0) {
        return <p className="quiz-board-empty">{emptyText}</p>;
    }

    const youListed = entries.some((e) => e.isYou);

    return (
        <>
            <ol className="quiz-board-list">
                {entries.map((entry) => (
                    <li key={entry.rank} className={`quiz-board-row${entry.isYou ? " quiz-board-row--you" : ""}`}>
                        <span className="quiz-board-rank">{MEDALS[entry.rank - 1] ?? entry.rank}</span>
                        <span className="quiz-board-name">
                            {entry.name}
                            {entry.isYou && <span className="quiz-board-you">You</span>}
                        </span>
                        <span className="quiz-board-meta">
                            {entry.games} {entry.games === 1 ? "game" : "games"} · {formatPercent(entry.accuracy)}
                        </span>
                        <span className="quiz-board-total">{formatPoints(entry.total)}</span>
                    </li>
                ))}
            </ol>
            {!youListed && (
                <p className="quiz-board-note">
                    {yourTotal
                        ? `You: ${formatPoints(yourTotal)} · not in the top ${entries.length} yet`
                        : "You're not on this board yet. Finish a quiz to join!"}
                </p>
            )}
            {footnote && <p className="quiz-board-note">{footnote}</p>}
        </>
    );
}

function YourStats({ stats }: { stats: UserQuizStats | null }) {
    if (stats === null) {
        return <p className="quiz-play-error">Couldn&apos;t load your stats. Please try again later.</p>;
    }
    if (stats.games === 0) {
        return <p className="quiz-board-empty">You haven&apos;t finished a quiz yet. Your stats will show up here.</p>;
    }
    return (
        <dl className="quiz-results-stats quiz-board-stats">
            <StatTile label="Games" value={stats.games} />
            <StatTile label="Total points" value={formatPoints(stats.total)} />
            <StatTile label="This week" value={formatPoints(stats.weekTotal)} />
            <StatTile label="Accuracy" value={formatPercent(stats.accuracy)} />
            <StatTile label="Best streak" value={`🔥 ${stats.bestStreak}`} />
            <StatTile
                label={
                    stats.bestGame
                        ? `Best game · ${MODE_LABEL[stats.bestGame.mode] ?? stats.bestGame.mode} ${DIFFICULTY_LABEL[stats.bestGame.difficulty] ?? stats.bestGame.difficulty}`
                        : "Best game"
                }
                value={stats.bestGame ? formatPoints(stats.bestGame.score) : "–"}
            />
        </dl>
    );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="quiz-results-stat">
            <dt>{label}</dt>
            <dd>{value}</dd>
        </div>
    );
}

function formatPoints(points: number): string {
    return `${points.toLocaleString("en-US")} pts`;
}

function formatPercent(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
}

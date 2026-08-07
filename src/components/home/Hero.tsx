"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiMagicIcon,
  ArrowRight01Icon,
  Search01Icon,
  Quiz01Icon,
  SparklesIcon,
  KanbanIcon,
  Award01Icon,
  Compass01Icon,
} from "@hugeicons/core-free-icons";

const samplePrompts = [
  "Anime like Attack on Titan",
  "Overpowered MC",
  "Romance with a sad ending",
  "Top Seasonal 2026",
];

const features = [
  {
    icon: AiMagicIcon,
    title: "AI Natural Discovery",
    description: "Search in plain English. Describe a vibe, trope, or favorite plot point.",
  },
  {
    icon: KanbanIcon,
    title: "Kanban Watchlist",
    description: "Organize your anime with drag-and-drop Watching, Completed, and Plan-to-Watch boards.",
  },
  {
    icon: Award01Icon,
    title: "Anime Quizzes",
    description: "Test your knowledge on characters, openings, voice actors, and studios with lifelines.",
  },
  {
    icon: Compass01Icon,
    title: "Smart Recommendations",
    description: "Explore personalized recommendations tailored to your unique genre preferences.",
  },
];

export default function Hero() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/generate?q=${encodeURIComponent(query.trim())}`);
  };

  const handlePromptClick = (prompt: string) => {
    setQuery(prompt);
    router.push(`/generate?q=${encodeURIComponent(prompt)}`);
  };

  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* ── Badge ── */}
        <div className="hero-badge-wrapper">
          <div className="hero-badge">
            <HugeiconsIcon icon={SparklesIcon} size={14} strokeWidth={1.8} />
            <span>Next-Gen AI Anime Platform</span>
          </div>
        </div>

        {/* ── Headline ── */}
        <h1 className="hero-title">
          Discover, Organize & <span className="hero-accent-text">Experience</span> Anime.
        </h1>

        {/* ── Subtitle ── */}
        <p className="hero-subtitle">
          Stop scrolling endlessly. Ask AI in natural language, track your watchlist on interactive
          Kanban boards, and compete in community trivia.
        </p>

        {/* ── Call to Action Buttons ── */}
        <div className="hero-actions">
          <Link href="/generate" className="btn-primary">
            <span>Try AI Generator</span>
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </Link>
          <Link href="/quiz" className="btn-secondary">
            <HugeiconsIcon icon={Quiz01Icon} size={16} strokeWidth={1.8} />
            <span>Take a Quiz</span>
          </Link>
        </div>

        {/* ── Interactive Search / AI Bar ── */}
        <div className="hero-search-card">
          <form onSubmit={handleSearch} className="hero-search-form">
            <div className="hero-search-icon">
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.8} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'I want a psychological thriller with high stakes'..."
              className="hero-search-input"
            />
            <button type="submit" className="hero-search-btn">
              <HugeiconsIcon icon={AiMagicIcon} size={16} strokeWidth={1.8} />
              <span>Ask AI</span>
            </button>
          </form>

          {/* Quick Prompts */}
          <div className="hero-prompt-chips">
            <span className="hero-prompt-label">Try:</span>
            {samplePrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                className="hero-prompt-chip"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* ── Feature Cards Grid ── */}
        <div className="hero-features-grid">
          {features.map((item) => (
            <div key={item.title} className="hero-feature-card">
              <div className="hero-feature-icon">
                <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.8} />
              </div>
              <h3 className="hero-feature-title">{item.title}</h3>
              <p className="hero-feature-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

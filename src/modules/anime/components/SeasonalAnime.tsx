"use client";

import { useState } from "react";

import { getCurrentSeason } from "@/lib/utils/get-current-season";
import { useSeasonal } from "@/modules/anime/queries/use-seasonal";
import { AnimeGrid } from "./AnimeGrid";

const SEASONS = ["winter", "spring", "summer", "fall"] as const;
type Season = (typeof SEASONS)[number];

const SEASON_LABELS: Record<Season, string> = {
    winter: "❄️ Winter",
    spring: "🌸 Spring",
    summer: "☀️ Summer",
    fall: "🍂 Fall",
};

export function SeasonalAnime() {
    const { season: currentSeason, year: currentYear } = getCurrentSeason();

    const [selectedSeason, setSelectedSeason] = useState<Season>(
        currentSeason as Season,
    );
    const [selectedYear] = useState(currentYear);

    const { data: anime, isLoading, error } = useSeasonal(selectedSeason, selectedYear);

    return (
        <div className="seasonal-anime">
            {/* Tabs */}
            <div className="seasonal-tabs" role="tablist" aria-label="Season">
                {SEASONS.map((season) => (
                    <button
                        key={season}
                        role="tab"
                        aria-selected={selectedSeason === season}
                        className={`seasonal-tab ${selectedSeason === season ? "seasonal-tab-active" : ""}`}
                        onClick={() => setSelectedSeason(season)}
                    >
                        {SEASON_LABELS[season]}
                    </button>
                ))}
            </div>

            {/* Year label */}
            <p className="seasonal-year-label">{selectedYear}</p>

            {/* Grid */}
            <AnimeGrid
                anime={anime}
                isLoading={isLoading}
                error={error}
                skeletonCount={12}
            />
        </div>
    );
}

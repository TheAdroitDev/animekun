type Season = "winter" | "spring" | "summer" | "fall";

export interface CurrentSeason {
    season: Season;
    year: number;
}


// Returns the current anime season and year based on the current date.

// Season ranges (standard anime calendar):
// - Winter: January – March
// - Spring: April – June
// - Summer: July – September
// - Fall:   October – December


export function getCurrentSeason(): CurrentSeason {
    const now = new Date();
    const month = now.getMonth() + 1; // 1–12
    const year = now.getFullYear();

    let season: Season;

    if (month >= 1 && month <= 3) season = "winter";
    else if (month >= 4 && month <= 6) season = "spring";
    else if (month >= 7 && month <= 9) season = "summer";
    else season = "fall";

    return { season, year };
}

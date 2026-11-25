import type { z } from "zod";

import type { Anime } from "@/services/anime-provider/types";

import type { recommendationsResponseSchema } from "../validations/generate-schema";

// One AI recommendation (title, why it matches, confidence 0–1).
export type Recommendation = z.infer<typeof recommendationsResponseSchema>["recommendations"][number];

// A recommendation matched to a real anime (null: no exact title match on Tenrai).
export type ResolvedRecommendation = Recommendation & { anime: Anime | null };

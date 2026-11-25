import type { z } from "zod";

import type { recommendationsResponseSchema } from "../validations/generate-schema";

// One AI recommendation (title, why it matches, confidence 0–1).
export type Recommendation = z.infer<typeof recommendationsResponseSchema>["recommendations"][number];

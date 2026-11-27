import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { feedback } from "@/db/schema";
import { ApiResponse } from "@/lib/utils/api-response";
import { getEnv } from "@/lib/config/env";
import {
  FEEDBACK_NEXT_IDS,
  FEEDBACK_PAGE_MAX,
  FEEDBACK_RATINGS,
} from "@/components/feedback/constants";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  rating: z.enum(FEEDBACK_RATINGS),
  // "What should we build next?" (optional, one tap).
  next: z.enum(FEEDBACK_NEXT_IDS).optional(),
  // Path only (the card sends location.pathname): never query strings.
  page: z.string().startsWith("/").max(FEEDBACK_PAGE_MAX).optional(),
  // Honeypot: a hidden field people never fill in. Bots that fill every
  // input get a fake success and nothing is stored.
  website: z.string().optional(),
});

/**
 * Anonymous feedback from the suggestion-box card. No session read, so
 * anyone can send one. Abuse limits here are cheap ones only (same-origin
 * check, honeypot, fixed choices); a per-IP rate limit belongs in a Vercel
 * Firewall rule, not in a DB lookup per request.
 */
export async function POST(req: NextRequest) {
  try {
    const { DATABASE_URL } = getEnv();
    if (!DATABASE_URL) {
      return ApiResponse.error("Feedback isn't available right now.", 503);
    }

    // Browsers always send Origin on a cross-site POST; reject other sites.
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.nextUrl.host) {
      return ApiResponse.forbidden();
    }

    const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return ApiResponse.badRequest("Pick a rating first.");
    }

    const { rating, next, page, website } = parsed.data;
    if (website) {
      return ApiResponse.created(null, "Feedback recorded");
    }

    await db.insert(feedback).values({
      rating,
      featureVote: next ?? null,
      page: page ?? null,
    });

    return ApiResponse.created(null, "Feedback recorded");
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return ApiResponse.error("Couldn't save your feedback. Try again.", 500);
  }
}

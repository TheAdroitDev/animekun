import { NextRequest } from "next/server";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { ApiResponse } from "@/lib/utils/api-response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { speedVote, featureVote, comment } = body;

    if (!speedVote || typeof speedVote !== "string") {
      return ApiResponse.badRequest("Speed vote is required.");
    }

    const validSpeedVotes = ["very_fast", "fast", "chill"];
    if (!validSpeedVotes.includes(speedVote)) {
      return ApiResponse.badRequest("Invalid option for speed vote.");
    }

    const [inserted] = await db
      .insert(feedback)
      .values({
        speedVote,
        featureVote: typeof featureVote === "string" && featureVote.trim() ? featureVote.trim().slice(0, 100) : null,
        comment: typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 500) : null,
      })
      .returning();

    return ApiResponse.created(inserted, "Feedback recorded successfully");
  } catch (error) {
    console.error("Failed to save feedback:", error);
    return ApiResponse.error("Failed to save feedback", 500);
  }
}

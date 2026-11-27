import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Feedback from the suggestion-box card.
 *
 * Current fields: `rating`, `feature_vote` ("what should we build next?")
 * and `page`. `speed_vote` and `comment` are from the old launch poll:
 * nullable, kept so existing rows stay readable. Text columns, not Postgres
 * enums, because enum values can't be dropped cleanly later.
 */
export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  rating: text("rating"),
  comment: text("comment"),
  page: text("page"),
  speedVote: text("speed_vote"),
  featureVote: text("feature_vote"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

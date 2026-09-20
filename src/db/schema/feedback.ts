import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  speedVote: text("speed_vote").notNull(),
  featureVote: text("feature_vote"),
  comment: text("comment"),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

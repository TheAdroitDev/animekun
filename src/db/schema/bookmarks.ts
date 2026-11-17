import {
    integer,
    pgEnum,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

// The 5 Kanban columns. The status lives on the bookmark itself, so moving
// a card is one UPDATE and adding one is one upsert (neon-http has no
// transactions).
export const bookmarkStatusEnum = pgEnum("bookmark_status", [
    "watching",
    "completed",
    "plan_to_watch",
    "on_hold",
    "dropped",
]);

// Bookmarks: one row per (user, anime).
export const bookmarks = pgTable(
    "bookmarks",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, {
                onDelete: "cascade",
            }),
        animeId: text("anime_id").notNull(),
        status: bookmarkStatusEnum("status").notNull(),
        title: text("title").notNull(),
        posterUrl: text("poster_url"),
        // Only used by optional drag-and-drop reordering (step 7.11).
        position: integer("position").notNull().default(0),
        addedAt: timestamp("added_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        // Makes duplicate bookmarks impossible and is the upsert's conflict
        // target. user_id leads, so it also serves "all bookmarks of a user"
        // (no separate user_id index needed).
        uniqueIndex("bookmarks_user_anime_unique").on(table.userId, table.animeId),
    ],
);

/*
users
  │ 1
  │
  └────── * bookmarks (status: watching | completed | plan_to_watch | on_hold | dropped)
*/

import {
    integer,
    pgTable,
    text,
    timestamp,
    uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

// Bookmark Boards
export const bookmarkBoards = pgTable("bookmark_boards", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, {
            onDelete: "cascade",
        }),

    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});

// Bookmarks
export const bookmarks = pgTable("bookmarks", {
    id: uuid("id").primaryKey().defaultRandom(),
    boardId: uuid("board_id")
        .notNull()
        .references(() => bookmarkBoards.id, {
            onDelete: "cascade",
        }),
    animeId: text("anime_id").notNull(),
    title: text("title").notNull(),
    posterUrl: text("poster_url"),
    position: integer("position").notNull().default(0),
    addedAt: timestamp("added_at", {
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),
});


/* Example:  Bookmark does not directly belong to a user, but rather belongs to a bookmark board which belongs to a user. 
users
  │
  │ 1
  │
  └────── * bookmark_boards
                  │
                  │ 1
                  │
                  └────── * bookmarks */
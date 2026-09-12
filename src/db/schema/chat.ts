import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./users";

// Chat Messages

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    content: text("content").notNull(),

    readAt: timestamp("read_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_sender_receiver_created_idx").on(
      table.senderId,
      table.receiverId,
      table.createdAt,
    ),
  ],
);

// Notifications

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  type: text("type").notNull(),

  message: text("message").notNull(),

  readAt: timestamp("read_at", {
    withTimezone: true,
  }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});
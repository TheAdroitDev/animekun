import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { db } from  "./index"

import {
  users,
} from "./schema";

// Seed users

const seedUsers = [
  {
    name: "Shivam",
    email: "shivam@animekun.dev",
    emailVerified: true,
    avatarUrl: null,
    bio: "Anime fan and builder.",
    role: "user" as const,
    tier: "free" as const,
  },
  {
    name: "Rahul",
    email: "rahul@animekun.dev",
    emailVerified: true,
    avatarUrl: null,
    bio: "I watch way too much anime.",
    role: "user" as const,
    tier: "free" as const,
  },
  {
    name: "Aditi",
    email: "aditi@animekun.dev",
    emailVerified: true,
    avatarUrl: null,
    bio: "Anime enthusiast.",
    role: "user" as const,
    tier: "premium" as const,
  },
];

// Seed

async function seed() {
  console.log("🌱 Starting database seed...");

  // Clean only our development seed users.
  // DO NOT use this against a production database.
  await db
    .delete(users)
    .where(
      inArray(
        users.email,
        seedUsers.map((user) => user.email),
      ),
    );

  // Insert users
  const insertedUsers = await db
    .insert(users)
    .values(seedUsers)
    .returning({
      id: users.id,
      email: users.email,
    });

  console.log(`✅ Inserted ${insertedUsers.length} users`);

  console.log("🌱 Database seed completed successfully.");
}

seed()
  .catch((error) => {
    console.error("❌ Database seed failed:");
    console.error(error);
    process.exit(1);
  });
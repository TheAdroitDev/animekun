import "dotenv/config";

import { eq, inArray } from "drizzle-orm";

import { db } from  "./index"

import {
  users,
  quizScores,
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

  const shivam = insertedUsers.find(
    (user) => user.email === "shivam@animekun.dev",
  );

  const rahul = insertedUsers.find(
    (user) => user.email === "rahul@animekun.dev",
  );

  const aditi = insertedUsers.find(
    (user) => user.email === "aditi@animekun.dev",
  );

  if (!shivam || !rahul || !aditi) {
    throw new Error("Failed to find seeded users.");
  }

  // ---------------------------------------------------
  // Quiz scores
  // ---------------------------------------------------

  const insertedScores = await db
    .insert(quizScores)
    .values([
      {
        userId: shivam.id,
        mode: "guess-anime",
        difficulty: "easy",
        score: 850,
        correctCount: 8,
        totalCount: 10,
        streak: 4,
      },
      {
        userId: shivam.id,
        mode: "guess-character",
        difficulty: "medium",
        score: 1200,
        correctCount: 9,
        totalCount: 10,
        streak: 7,
      },
      {
        userId: rahul.id,
        mode: "guess-anime",
        difficulty: "hard",
        score: 950,
        correctCount: 7,
        totalCount: 10,
        streak: 3,
      },
      {
        userId: aditi.id,
        mode: "guess-opening",
        difficulty: "nightmare",
        score: 1500,
        correctCount: 9,
        totalCount: 10,
        streak: 8,
      },
    ])
    .returning({
      id: quizScores.id,
      userId: quizScores.userId,
      score: quizScores.score,
    });

  console.log(`✅ Inserted ${insertedScores.length} quiz scores`);

  console.log("🌱 Database seed completed successfully.");
}

seed()
  .catch((error) => {
    console.error("❌ Database seed failed:");
    console.error(error);
    process.exit(1);
  });
import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getEnv } from "@/lib/config/env";
import * as schema from "./schema";

const { DATABASE_URL } = getEnv();

// Safe fallback for build-time static evaluation when DATABASE_URL is not provided
const connectionString =
  DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder";

const sql = neon(connectionString);

export const db = drizzle(sql, {
  schema,
});
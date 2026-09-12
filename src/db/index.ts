import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getEnv } from "@/lib/config/env";
import * as schema from "./schema";

const { DATABASE_URL } = getEnv();

const sql = neon(DATABASE_URL);

export const db = drizzle(sql, {
  schema,
});


/* 

import "dotenv/config";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, {
  schema,
});
*/
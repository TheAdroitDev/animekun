import * as z from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required"),

  BETTER_AUTH_SECRET: z
    .string()
    .min(1, "BETTER_AUTH_SECRET is required"),

  IMAGEKIT_PUBLIC_KEY: z
    .string()
    .min(1, "IMAGEKIT_PUBLIC_KEY is required"),

  IMAGEKIT_PRIVATE_KEY: z
    .string()
    .min(1, "IMAGEKIT_PRIVATE_KEY is required"),

  IMAGEKIT_URL_ENDPOINT: z
    .string()
    .url("IMAGEKIT_URL_ENDPOINT must be a valid URL"),

  AI_API_KEY: z
    .string()
    .min(1, "AI_API_KEY is required"),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);

  if (!safeParseResult.success) {
    console.error(safeParseResult.error.message);
    throw new Error("Invalid environment variables");
  }

  return safeParseResult.data;
}

export function getEnv() {
  return createEnv(process.env);
}
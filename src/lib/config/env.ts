import * as z from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z
    .string()
    .url("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT must be a valid URL")
    .optional()
    .default(""),
});

const serverEnvSchema = clientEnvSchema.extend({
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

  AI_API_KEY: z
    .string()
    .min(1, "AI_API_KEY is required"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function createEnv(env: NodeJS.ProcessEnv): ServerEnv {
  if (typeof window !== "undefined") {
    const parsedClient = clientEnvSchema.safeParse({
      NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT:
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    });

    if (!parsedClient.success) {
      console.error(parsedClient.error.message);
      throw new Error("Invalid client environment variables");
    }

    return parsedClient.data as ServerEnv;
  }

  const safeParseResult = serverEnvSchema.safeParse(env);

  if (!safeParseResult.success) {
    console.error(safeParseResult.error.message);
    throw new Error("Invalid environment variables");
  }

  return safeParseResult.data;
}

let cachedEnv: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = createEnv(process.env);
  }
  return cachedEnv;
}
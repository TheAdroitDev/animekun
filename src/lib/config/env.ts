import * as z from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z
    .string()
    .url("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT must be a valid URL")
    .or(z.literal(""))
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
    .optional()
    .default(""),

  // Read by Better Auth directly (src/auth.ts); validated here so a weak or
  // malformed value fails early with a clear message.
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)")
    .or(z.literal(""))
    .optional()
    .default(""),

  // Public origin of the app, e.g. http://localhost:3000 or https://your-domain.com
  BETTER_AUTH_URL: z
    .string()
    .url("BETTER_AUTH_URL must be a valid URL")
    .optional(),

  AI_API_KEY: z
    .string()
    .optional()
    .default(""),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function createEnv(env: NodeJS.ProcessEnv): ServerEnv {
  if (typeof window !== "undefined") {
    const parsedClient = clientEnvSchema.safeParse({
      NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT:
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    });

    if (!parsedClient.success) {
      const formatted = parsedClient.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ");
      console.error("Invalid client environment variables:", formatted);
      throw new Error(`Invalid client environment variables: ${formatted}`);
    }

    return parsedClient.data as ServerEnv;
  }

  const safeParseResult = serverEnvSchema.safeParse(env);

  if (!safeParseResult.success) {
    const formatted = safeParseResult.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    console.error("Invalid environment variables:", formatted);
    throw new Error(`Invalid environment variables: ${formatted}`);
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
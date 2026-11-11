import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/auth";

// Catch-all for Better Auth: sign-up, sign-in, sign-out, get-session,
// OAuth callbacks (/api/auth/callback/google in 6.7), etc.
// Not CDN-cached (responses set per-user cookies); /api/ is disallowed in robots.txt.
export const { GET, POST } = toNextJsHandler(auth);

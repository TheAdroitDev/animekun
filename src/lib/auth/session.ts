import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, type Session } from "@/auth";
import { ROUTES } from "@/lib/constants/route";

/**
 * Server-side session checks (server components, Server Actions, route
 * handlers only). The proxy only checks that a cookie exists; this is the
 * real check. Always take the user id from the returned session, never
 * from the client.
 *
 * Kept out of modules/auth/index.ts on purpose: that barrel is imported by
 * client components, and this file must never reach the browser bundle.
 */

//  The current session, or null. Use in Server Actions and route handlers (return 401). 
export async function getServerSession(): Promise<Session | null> {
    return auth.api.getSession({ headers: await headers() });
}

// The current session, or a redirect to login that comes back to `returnTo`. Use in pages. 
export async function requireSession(returnTo: string): Promise<Session> {
    const session = await getServerSession();
    if (!session) {
        redirect(`${ROUTES.AUTH.LOGIN}?redirect=${encodeURIComponent(returnTo)}`);
    }
    return session;
}

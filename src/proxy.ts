import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Route protection (Next 16 "proxy", formerly middleware).
 *
 * ONE job: send logged-out users from protected routes to the login page,
 * keeping where they were going (?redirect=, path + query).
 *
 * Optimistic check only: does a session cookie EXIST? No DB call here
 * (Better Auth's recommendation). The real check (auth.api.getSession)
 * happens server-side in each protected page/route as it gets built.
 *
 * Security headers live in next.config.ts (free, no function run).
 */
export function proxy(request: NextRequest) {
    if (getSessionCookie(request)) return NextResponse.next();

    const { pathname, search } = request.nextUrl;
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + search);

    return NextResponse.redirect(loginUrl);
}

// Runs ONLY on protected routes. Every other page (home, search, anime)
// never invokes the proxy, so public traffic costs nothing extra.
export const config = {
    matcher: [
        "/bookmarks/:path*",
        "/profile/:path*",
        "/generate/:path*",
        "/quiz/:path*",
        "/chat/:path*",
        "/admin/:path*",
    ],
};

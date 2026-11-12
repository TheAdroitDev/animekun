import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/lib/constants/route";
import { SignupForm } from "@/modules/auth/components/SignupForm";

// Static page: no session check here (that would make it dynamic).
// Logged-in users are redirected away by the proxy in step 6.9.
export const metadata: Metadata = {
    title: "Sign up | AnimeKun",
    description: "Create your AnimeKun account to bookmark anime, take quizzes and more.",
    // Auth pages bring no search traffic: keep them out of the index.
    robots: { index: false, follow: true },
};

export default function SignupPage() {
    return (
        <section className="auth-section">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">Create your account</h1>
                    <p className="auth-subtitle">
                        Bookmark anime, take quizzes and get recommendations.
                    </p>
                </div>

                <SignupForm />

                <p className="auth-switch">
                    Already have an account?{" "}
                    <Link href={ROUTES.AUTH.LOGIN} className="auth-switch-link">
                        Log in
                    </Link>
                </p>
            </div>
        </section>
    );
}

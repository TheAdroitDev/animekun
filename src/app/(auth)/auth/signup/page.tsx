import type { Metadata } from "next";

import { ROUTES } from "@/lib/constants/route";
import { AuthCard } from "@/modules/auth/components/AuthCard";
import { AuthSwitchLink } from "@/modules/auth/components/AuthSwitchLink";
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
        <AuthCard
            title="Create your account"
            subtitle="Bookmark anime, take quizzes and get recommendations."
            footer={
                <AuthSwitchLink
                    prompt="Already have an account?"
                    linkText="Log in"
                    href={ROUTES.AUTH.LOGIN}
                />
            }
        >
            <SignupForm />
        </AuthCard>
    );
}

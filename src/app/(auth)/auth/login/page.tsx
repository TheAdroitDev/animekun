import type { Metadata } from "next";

import { ROUTES } from "@/lib/constants/route";
import { AuthCard } from "@/modules/auth/components/AuthCard";
import { AuthSwitchLink } from "@/modules/auth/components/AuthSwitchLink";
import { LoginForm } from "@/modules/auth/components/LoginForm";

// Static page: no session check here (that would make it dynamic).
export const metadata: Metadata = {
    title: "Log in | AnimeKun",
    description: "Log in to your AnimeKun account.",
    robots: { index: false, follow: true },
};

export default function LoginPage() {
    return (
        <AuthCard
            title="Welcome back"
            subtitle="Log in to see your bookmarks, quizzes and recommendations."
            footer={
                <AuthSwitchLink
                    prompt="Don't have an account?"
                    linkText="Sign up"
                    href={ROUTES.AUTH.SIGNUP}
                />
            }
        >
            <LoginForm />
        </AuthCard>
    );
}

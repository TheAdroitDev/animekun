"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signIn } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/modules/auth/validations/auth-schema";
import { getRedirectFromLocation } from "@/modules/auth/utils/safe-redirect";

import { AuthField } from "./AuthField";

/**
 * Maps Better Auth error responses to user-facing messages.
 * Never reveals whether an email has an account (one combined message).
 */
function getLoginErrorMessage(error: { code?: string; status?: number }): string {
    if (error.code === "INVALID_EMAIL_OR_PASSWORD") {
        return "Incorrect email or password.";
    }
    if (error.status === 429) {
        return "Too many attempts. Please try again in a minute.";
    }
    return "Something went wrong logging you in. Please try again.";
}

export function LoginForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        mode: "onTouched",
    });

    const onSubmit = async ({ email, password }: LoginInput) => {
        setFormError(null);

        const { error } = await signIn.email({ email, password });

        if (error) {
            setFormError(getLoginErrorMessage(error));
            return;
        }

        router.replace(getRedirectFromLocation());
    };

    return (
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <AuthField
                id="login-email"
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                error={errors.email?.message}
                {...register("email")}
            />

            <AuthField
                id="login-password"
                label="Password"
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register("password")}
            />

            {formError && (
                <p className="auth-form-error" role="alert">
                    {formError}
                </p>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Logging in…" : "Log in"}
            </button>
        </form>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signUp } from "@/lib/auth-client";
import { signupSchema, type SignupInput } from "@/modules/auth/validations/auth-schema";
import { getRedirectFromLocation } from "@/modules/auth/utils/safe-redirect";

import { AuthField } from "./AuthField";

/** Maps Better Auth error responses to user-facing messages. */
function getSignupErrorMessage(error: { code?: string; status?: number }): string {
    if (error.code?.startsWith("USER_ALREADY_EXISTS")) {
        return "An account with this email already exists. Log in instead?";
    }
    if (error.status === 429) {
        return "Too many attempts. Please try again in a minute.";
    }
    return "Something went wrong creating your account. Please try again.";
}

export function SignupForm() {
    const router = useRouter();
    const [formError, setFormError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignupInput>({
        resolver: zodResolver(signupSchema),
        mode: "onTouched", // validate after a field is left, not on every keystroke
    });

    const onSubmit = async ({ name, email, password }: SignupInput) => {
        setFormError(null);

        // confirmPassword is form-only; never sent to the server
        const { error } = await signUp.email({ name, email, password });

        if (error) {
            setFormError(getSignupErrorMessage(error));
            return;
        }

        // autoSignIn is on: the user is already logged in
        router.replace(getRedirectFromLocation());
    };

    return (
        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <AuthField
                id="signup-name"
                label="Name"
                type="text"
                autoComplete="name"
                error={errors.name?.message}
                {...register("name")}
            />

            <AuthField
                id="signup-email"
                label="Email"
                type="email"
                autoComplete="email"
                inputMode="email"
                error={errors.email?.message}
                {...register("email")}
            />

            <AuthField
                id="signup-password"
                label="Password"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
            />

            <AuthField
                id="signup-confirm-password"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
            />

            {formError && (
                <p className="auth-form-error" role="alert">
                    {formError}
                </p>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating account…" : "Create account"}
            </button>
        </form>
    );
}

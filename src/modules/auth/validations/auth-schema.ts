import { z } from "zod";

// Single source of truth: also used by src/auth.ts (server-side enforcement).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 50;

// Normalize first, then validate: z.email() checks the format before any
// .trim() chained after it would run, so "  a@b.co " would be rejected.
const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address"));

export const signupSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(1, "Name is required")
            .max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or less`),
        email: emailSchema,
        // Length-only rules (NIST SP 800-63B): no forced symbols/uppercase.
        // Never trimmed: leading/trailing spaces are part of the password.
        password: z
            .string()
            .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
            .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or less`),
        // Form-only check; never sent to Better Auth.
        confirmPassword: z.string().min(1, "Please confirm your password"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Login only checks shape. The server decides if the password is correct,
// so tightening signup rules later never locks out existing users.
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

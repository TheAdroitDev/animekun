import type { InputHTMLAttributes } from "react";

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    error?: string;
}

/**
 * Label + input + error message, wired for accessibility:
 * the error is linked via aria-describedby and announced by screen readers.
 * Works with React Hook Form's register() (spread its props into this).
 */
export function AuthField({ id, label, error, ...inputProps }: AuthFieldProps) {
    const errorId = `${id}-error`;

    return (
        <div className="auth-field">
            <label htmlFor={id} className="auth-label">
                {label}
            </label>
            <input
                id={id}
                className="auth-input"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                {...inputProps}
            />
            {error && (
                <p id={errorId} className="auth-field-error">
                    {error}
                </p>
            )}
        </div>
    );
}

import type { ReactNode } from "react";

interface AuthCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Rendered below the form, e.g. the login/signup switch link. */
    footer?: ReactNode;
}

/** Shared card layout for the login and signup pages. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
    return (
        <section className="auth-section">
            <div className="auth-card">
                <div className="auth-header">
                    <h1 className="auth-title">{title}</h1>
                    {subtitle && <p className="auth-subtitle">{subtitle}</p>}
                </div>

                {children}

                {footer}
            </div>
        </section>
    );
}

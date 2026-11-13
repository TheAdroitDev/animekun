import type { ReactNode } from "react";

interface AuthCardProps {
    title: string;
    subtitle?: string;
    children: ReactNode;
    /** Rendered below the form, e.g. the login/signup switch link. */
    footer?: ReactNode;
    /** Full-bleed decorative layer behind the card (e.g. LoginBackdrop). */
    backdrop?: ReactNode;
}

/** Shared card layout for the auth pages. */
export function AuthCard({ title, subtitle, children, footer, backdrop }: AuthCardProps) {
    return (
        <section className={backdrop ? "auth-section auth-section--immersive" : "auth-section"}>
            {backdrop}
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

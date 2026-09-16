import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    viewAllHref?: string;
    viewAllLabel?: string;
    className?: string;
}

export function SectionHeader({
    title,
    subtitle,
    viewAllHref,
    viewAllLabel = "View All",
    className = "",
}: SectionHeaderProps) {
    return (
        <div className={`section-header ${className}`.trim()}>
            <div className="section-header-text">
                <h2 className="section-header-title">{title}</h2>
                {subtitle && <p className="section-header-subtitle">{subtitle}</p>}
            </div>

            {viewAllHref && (
                <Link href={viewAllHref} className="section-header-link">
                    <span>{viewAllLabel}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                </Link>
            )}
        </div>
    );
}

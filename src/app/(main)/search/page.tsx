import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wrench, ArrowLeft } from "lucide-react";

import { ROUTES } from "@/lib/constants/route";

export const metadata: Metadata = {
    title: "Under Maintenance | AnimeKun",
    description: "Search is currently under maintenance. It will come back soon.",
};

export default function SearchPage() {
    return (
        <section className="search-section">
            <div className="search-container maintenance-container">
                <div>
                    <div >
                        <Image
                            src="/doodles/maintenance.png"
                            alt="AnimeKun search is under maintenance"
                            width={460}
                            height={307}
                            priority
                        />
                    </div>

                    <div className="maintenance-content">
                        <span className="maintenance-badge">
                            <Wrench size={13} className="maintenance-badge-icon" />
                            Maintenance Mode
                        </span>

                        <h1 className="maintenance-title">
                            Under Maintenance
                        </h1>

                        <p className="maintenance-description">
                            We will come back soon guys!
                        </p>

                        <div className="maintenance-actions">
                            <Link href={ROUTES.HOME} className="maintenance-home-btn">
                                <ArrowLeft size={16} />
                                <span>Return to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

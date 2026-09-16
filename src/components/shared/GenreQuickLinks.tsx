import Link from "next/link";

import { GENRES } from "@/lib/constants/genres";
import { Badge } from "@/components/ui/badge";

 // Row of clickable genre badges (from lib/constants/genres.ts)
 // that navigate to /search?genre=action.
 // Pure Server Component.

export function GenreQuickLinks() {
    return (
        <div className="genre-quick-links-container">
            <div
                className="genre-quick-links"
                role="navigation"
                aria-label="Genre quick links"
            >
                {GENRES.map((genre) => (
                    <Link
                        key={genre.id}
                        href={`/search?genre=${genre.slug}`}
                        className="genre-quick-link"
                    >
                        <Badge variant="outline" className="genre-badge">
                            {genre.name}
                        </Badge>
                    </Link>
                ))}
            </div>
        </div>
    );
}

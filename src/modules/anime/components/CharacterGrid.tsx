import Image from "next/image";

import { getImageKitConfig } from "@/lib/config/imagekit";
import type { Character } from "@/modules/anime/types";

interface CharacterGridProps {
    characters: Character[];
    /** Max characters to display. Defaults to 12. */
    limit?: number;
}

function resolveImage(url: string | null, endpoint: string): string | null {
    if (!url || !endpoint) return url;
    if (url.startsWith(endpoint)) return url;
    return `${endpoint.replace(/\/$/, "")}/${url}`;
}

export function CharacterGrid({ characters, limit = 12 }: CharacterGridProps) {
    const { urlEndpoint } = getImageKitConfig();
    const visible = characters.slice(0, limit);

    if (visible.length === 0) return null;

    return (
        <div className="detail-block">
            <h2 className="detail-block-heading">Characters</h2>
            <div className="detail-characters-grid">
                {visible.map((c) => (
                    <div key={c.id} className="detail-char-card">
                        <div className="detail-char-img-wrap">
                            {c.imageUrl ? (
                                <Image
                                    src={resolveImage(c.imageUrl, urlEndpoint) ?? c.imageUrl}
                                    alt={c.name}
                                    width={68}
                                    height={90}
                                    className="detail-char-img"
                                    unoptimized
                                />
                            ) : (
                                <div className="detail-char-no-img">
                                    {c.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="detail-char-info">
                            <span className="detail-char-name">{c.name}</span>
                            {c.role && <span className="detail-char-role">{c.role}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

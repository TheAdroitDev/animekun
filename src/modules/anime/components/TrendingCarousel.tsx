"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTrending } from "@/modules/anime";
import { AnimeCard } from "@/modules/anime";
import { AnimeCardSkeleton } from "./AnimeCardSkeleton";

const SCROLL_AMOUNT = 600;

export function TrendingCarousel() {
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: anime, isLoading, error } = useTrending();

    function scroll(direction: "left" | "right") {
        if (!scrollRef.current) return;
        scrollRef.current.scrollBy({
            left: direction === "right" ? SCROLL_AMOUNT : -SCROLL_AMOUNT,
            behavior: "smooth",
        });
    }

    return (
        <div className="trending-carousel">
            {/* Arrow buttons */}
            <button
                className="trending-carousel-arrow trending-carousel-arrow-left"
                onClick={() => scroll("left")}
                aria-label="Scroll left"
            >
                <ChevronLeft size={20} />
            </button>

            <button
                className="trending-carousel-arrow trending-carousel-arrow-right"
                onClick={() => scroll("right")}
                aria-label="Scroll right"
            >
                <ChevronRight size={20} />
            </button>

            {/* Track */}
            <div className="trending-carousel-track" ref={scrollRef}>
                {isLoading &&
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="trending-carousel-item">
                            <AnimeCardSkeleton />
                        </div>
                    ))}

                {error && (
                    <p className="trending-carousel-error">
                        Failed to load trending anime. Please try again.
                    </p>
                )}

                {anime?.map((item) => (
                    <div key={item.id} className="trending-carousel-item">
                        <AnimeCard anime={item} />
                    </div>
                ))}
            </div>
        </div>
    );
}

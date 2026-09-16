import Hero from "@/components/home/Hero";
import { GenreQuickLinks, SectionHeader } from "@/components/shared";
import {
    TrendingCarousel,
    PopularGrid,
    SeasonalAnime,
} from "@/modules/anime";

export default function Home() {
    return (
        <div className="home-page">
            {/* Hero Section */}
            <Hero />

            {/* Content Sections Container */}
            <div className="home-sections">
                {/* ── 1. Trending Now ── */}
                <section className="home-section" aria-label="Trending anime">
                    <SectionHeader
                        title="Trending Now"
                        subtitle="Top airing anime trending this week"
                        viewAllHref="/search?sort=trending"
                    />
                    <TrendingCarousel />
                </section>

                {/* ── 2. All-Time Popular ── */}
                <section className="home-section" aria-label="Popular anime">
                    <SectionHeader
                        title="All-Time Popular"
                        subtitle="The most watched and highest rated anime of all time"
                        viewAllHref="/search?sort=popular"
                    />
                    <PopularGrid />
                </section>

                {/* ── 3. Seasonal Anime ── */}
                <section className="home-section" aria-label="Seasonal anime">
                    <SectionHeader
                        title="Seasonal Anime"
                        subtitle="Explore anime by release season"
                        viewAllHref="/search?sort=seasonal"
                    />
                    <SeasonalAnime />
                </section>

                {/* ── 4. Browse by Genre ── */}
                <section className="home-section" aria-label="Browse by genre">
                    <SectionHeader
                        title="Browse by Genre"
                        subtitle="Find anime tailored to your favorite styles"
                        viewAllHref="/search"
                    />
                    <GenreQuickLinks />
                </section>
            </div>
        </div>
    );
}

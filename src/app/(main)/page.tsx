import Hero from "@/components/home/Hero";
import GenerateSection from "@/components/home/GenerateSection";
import QuizSection from "@/components/home/QuizSection";
import TownHallSection from "@/components/home/TownHallSection";
import { SectionHeader } from "@/components/shared";
import {
    TrendingCarousel,
    PopularGrid,
    SeasonalAnime,
} from "@/modules/anime";

export default function Home() {
    return (
        <div className="home-page">
            <Hero />
            <GenerateSection />
            <QuizSection />
            <div className="home-sections">
                <section className="home-section" aria-label="Trending anime">
                    <SectionHeader
                        title="Trending Now"
                        subtitle="Top airing anime trending this week"
                        viewAllHref="/search?sort=trending"
                    />
                    <TrendingCarousel />
                </section>

                <section className="home-section" aria-label="Popular anime">
                    <SectionHeader
                        title="All-Time Popular"
                        subtitle="The most watched and highest rated anime of all time"
                        viewAllHref="/search?sort=popular"
                    />
                    <PopularGrid />
                </section>

                <section className="home-section" aria-label="Seasonal anime">
                    <SectionHeader
                        title="Seasonal Anime"
                        subtitle="Explore anime by release season"
                        viewAllHref="/search?sort=seasonal"
                    />
                    <SeasonalAnime />
                </section>
            </div>
            <TownHallSection />
        </div>
    );
}

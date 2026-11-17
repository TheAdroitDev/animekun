import Hero from "@/components/home/Hero";
import GenerateSection from "@/components/home/GenerateSection";
import QuizSection from "@/components/home/QuizSection";
import TownHallSection from "@/components/home/TownHallSection";
import { VillageScene } from "@/components/effects/VillageScene";
import { SectionHeader } from "@/components/shared";
import { ROUTES } from "@/lib/constants/route";
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
                        viewAllHref={`${ROUTES.SEARCH}?status=airing&sort=popularity`}
                    />
                    <TrendingCarousel />
                </section>

                <section className="home-section" aria-label="Popular anime">
                    <SectionHeader
                        title="All-Time Popular"
                        subtitle="The most watched and highest rated anime of all time"
                        viewAllHref={`${ROUTES.SEARCH}?sort=popularity`}
                    />
                    <PopularGrid />
                </section>

                <section className="home-section" aria-label="Seasonal anime">
                    <SectionHeader
                        title="Seasonal Anime"
                        subtitle="Explore anime by release season"
                        viewAllHref={`${ROUTES.SEARCH}?status=airing&sort=date`}
                    />
                    <SeasonalAnime />
                </section>
            </div>
            <TownHallSection />

            {/* Closing scene: ink village (lazy, loads near the bottom only) */}
            <section className="village-section" aria-label="Closing scene">
                <div className="village-section-head">
                    <p className="village-section-kicker">おやすみ</p>
                    <p className="village-section-title">Tadaima  ✌🏻</p>
                </div>
                <VillageScene />
            </section>
        </div>
    );
}

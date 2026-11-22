import SunMoonHeroIntro from "./components/SunMoonHeroIntro";
import FeaturedServices from "./components/FeaturedServices";
import WeddingCategoriesHub from "./components/WeddingCategoriesHub";

export default function HomePage() {
  return (
    <main
      style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
      className="min-h-screen"
    >
      <SunMoonHeroIntro waveFill="#FFEDF1" />

      <FeaturedServices />

      <WeddingCategoriesHub />

      {/* Next section one by one: Why Choose WedPlan? */}
    </main>
  );
}
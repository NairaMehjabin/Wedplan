import SunMoonHeroIntro from "./components/SunMoonHeroIntro";
import FeaturedServices from "./components/FeaturedServices";
import WeddingCategoriesHub from "./components/WeddingCategoriesHub";
import WedPlanEditorialSections from "./components/WedPlanEditorialSections";

export default function HomePage() {
  return (
    <main
      style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
      className="min-h-screen"
    >
      <SunMoonHeroIntro waveFill="#FFEDF1" />

      <FeaturedServices />

      <WeddingCategoriesHub />

      <WedPlanEditorialSections />
    </main>
  );
}
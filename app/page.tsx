import SunMoonHeroIntro from "./components/SunMoonHeroIntro";
import FeaturedServices from "./components/FeaturedServices";

export default function HomePage() {
  return (
    <main
      style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
      className="min-h-screen"
    >
      <SunMoonHeroIntro waveFill="#FFEDF1" />

      <FeaturedServices />

      {/* Next sections (Categories, Why Choose WedPlan, etc.) go here */}
    </main>
  );
}
import SunMoonHeroIntro from "./components/SunMoonHeroIntro";

export default function HomePage() {
  return (
    <main
      style={{ backgroundColor: "#F4E2E6", color: "#24020E" }}
      className="min-h-screen"
    >
      <SunMoonHeroIntro waveFill="#F4E2E6" />

      {/* Next sections (Featured Services, Categories, Why Choose WedPlan, etc.) go here */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="text-2xl font-semibold">Featured Wedding Services</h2>
      </section>
    </main>
  );
}
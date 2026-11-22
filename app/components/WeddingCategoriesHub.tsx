"use client";

import React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Grid, Sparkle } from "lucide-react";

const WEDPLAN_CATEGORIES = [
  {
    name: "All Services",
    queryValue: "All",
    bg: "bg-[#FCF9F4]",
    text: "text-[#24020E]",
    border: "border-[#24020E]",
    hoverBg: "hover:bg-[#24020E] hover:text-[#FCF9F4]",
  },
  {
    name: "Photography & Cinematography",
    queryValue: "Photography & Cinematography",
    bg: "bg-[#FFF4F7]",
    text: "text-[#9D2B4B]",
    border: "border-[#9D2B4B]",
    hoverBg: "hover:bg-[#9D2B4B] hover:text-[#FFF4F7]",
  },
  {
    name: "Bridal Makeup & Styling",
    queryValue: "Bridal Makeup & Styling",
    bg: "bg-[#EFEAFF]",
    text: "text-[#4C1D95]",
    border: "border-[#4C1D95]",
    hoverBg: "hover:bg-[#4C1D95] hover:text-[#EFEAFF]",
  },
  {
    name: "Catering & Desserts",
    queryValue: "Catering & Desserts",
    bg: "bg-[#F4EFE6]",
    text: "text-[#4A2C2A]",
    border: "border-[#4A2C2A]",
    hoverBg: "hover:bg-[#4A2C2A] hover:text-[#F4EFE6]",
  },
  {
    name: "Stage & Venue Decor",
    queryValue: "Stage & Venue Decor",
    bg: "bg-[#FEF9EC]",
    text: "text-[#854D0E]",
    border: "border-[#854D0E]",
    hoverBg: "hover:bg-[#854D0E] hover:text-[#FEF9EC]",
  },
  {
    name: "Mehndi & Henna",
    queryValue: "Mehndi & Henna",
    bg: "bg-[#E8F3E8]",
    text: "text-[#2D5A27]",
    border: "border-[#2D5A27]",
    hoverBg: "hover:bg-[#2D5A27] hover:text-[#E8F3E8]",
  },
  {
    name: "Wedding Planner & Event",
    queryValue: "Wedding Planner & Event",
    bg: "bg-[#E3F6F5]",
    text: "text-[#0F514C]",
    border: "border-[#0F514C]",
    hoverBg: "hover:bg-[#0F514C] hover:text-[#E3F6F5]",
  },
  {
    name: "DJ & Entertainment",
    queryValue: "DJ & Entertainment",
    bg: "bg-[#FFF0F6]",
    text: "text-[#831843]",
    border: "border-[#831843]",
    hoverBg: "hover:bg-[#831843] hover:text-[#FFF0F6]",
  },
  {
    name: "Bridal Wear & Attire",
    queryValue: "Bridal Wear & Attire",
    bg: "bg-[#F3E8FF]",
    text: "text-[#581C87]",
    border: "border-[#581C87]",
    hoverBg: "hover:bg-[#581C87] hover:text-[#F3E8FF]",
  },
];

export default function WeddingCategoriesHub() {
  const router = useRouter();

  const handleCategoryRedirect = (queryValue: string) => {
    if (!queryValue || queryValue === "All") {
      router.push("/browse-services");
      return;
    }
    router.push(`/browse-services?category=${encodeURIComponent(queryValue)}`);
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 text-center md:px-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.45 }}
        className="mb-12"
      >
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#24020E]/15 bg-white/75 px-3 py-1 text-[10px] font-black tracking-widest text-[#24020E] uppercase">
          <Grid size={12} /> Wedding Service Categories
        </div>
        <h2
          style={{ fontFamily: "var(--font-curly), cursive" }}
          className="text-4xl text-[#24020E] sm:text-5xl"
        >
          Explore By Specialty
        </h2>
        <p className="mx-auto mt-2 max-w-md text-xs font-semibold tracking-wider text-[#24020E]/70 uppercase">
          Pick a category to jump straight into matching wedding services.
        </p>
      </motion.div>

      <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-4 md:gap-5">
        {WEDPLAN_CATEGORIES.map((cat) => (
          <motion.button
            key={cat.name}
            type="button"
            whileHover={{
              scale: 1.05,
              rotate: [-1, 1, -1][cat.name.length % 3],
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleCategoryRedirect(cat.queryValue)}
            className={`group flex cursor-pointer items-center gap-2.5 rounded-[24px] border-2 ${cat.border} ${cat.bg} ${cat.text} ${cat.hoverBg} px-6 py-4 text-xs font-black tracking-[0.14em] uppercase shadow-xs transition-all duration-300 hover:shadow-md md:text-sm`}
          >
            <Sparkle
              size={14}
              className="opacity-75 transition-transform group-hover:rotate-45"
            />
            <span>{cat.name}</span>
            <ArrowUpRight size={14} className="opacity-65" />
          </motion.button>
        ))}
      </div>
    </section>
  );
}
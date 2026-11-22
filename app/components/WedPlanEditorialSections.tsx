"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  Clock,
  Compass,
  SearchCheck,
  CalendarHeart,
  BadgeCheck,
  ArrowRight,
  Heart,
  Check,
} from "lucide-react";

const FADE_AURAS = [
  // Soft blush / light-pink circle auras
  {
    id: "ed-pk-1",
    className: "-top-12 -left-24 h-80 w-80 sm:h-[420px] sm:w-[420px]",
    background:
      "radial-gradient(circle, rgba(255, 224, 232, 0.72) 0%, rgba(255, 237, 241, 0.25) 58%, transparent 76%)",
    driftX: 16,
    driftY: -14,
    duration: 8.5,
  },
  {
    id: "ed-pk-2",
    className: "top-[46%] -left-24 h-80 w-80 sm:h-[430px] sm:w-[430px]",
    background:
      "radial-gradient(circle, rgba(232, 155, 174, 0.28) 0%, rgba(255, 244, 247, 0.14) 60%, transparent 76%)",
    driftX: 18,
    driftY: -12,
    duration: 11,
  },
  // Subtle mint-blue circle auras
  {
    id: "ed-mt-1",
    className: "top-20 right-[6%] h-72 w-72 sm:h-[380px] sm:w-[380px]",
    background:
      "radial-gradient(circle, rgba(186, 238, 233, 0.56) 0%, rgba(227, 246, 245, 0.22) 58%, transparent 76%)",
    driftX: -14,
    driftY: -16,
    duration: 9.8,
  },
  {
    id: "ed-mt-2",
    className: "-bottom-16 right-[16%] h-80 w-80 sm:h-[410px] sm:w-[410px]",
    background:
      "radial-gradient(circle, rgba(153, 246, 228, 0.45) 0%, rgba(227, 246, 245, 0.18) 58%, transparent 76%)",
    driftX: -12,
    driftY: -14,
    duration: 9,
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    code: "01",
    badge: "Vetted Craft",
    title: "Curated Studios, Zero Guesswork",
    shortPerk: "Admin-reviewed portfolios & active listings",
    description:
      "Every vendor profile and service listing goes through review before going live, so you compare genuine portfolios rather than endless unverified listings.",
    metric: "Reviewed & Active Only",
    icon: ShieldCheck,
    accentClass: "bg-[#E3F6F5]/85 border-teal-800/20 text-teal-950",
    iconColor: "text-teal-700",
    tilt: -1.2,
  },
  {
    code: "02",
    badge: "Transparent Flow",
    title: "Clear Dates, Clear Statuses",
    shortPerk: "Real-time booking state from request to confirm",
    description:
      "Send booking inquiries tied to your exact ceremony date and venue, then track every request from Pending to Accepted in one calm workspace.",
    metric: "Live Status Tracking",
    icon: Clock,
    accentClass: "bg-[#FFF4F7]/95 border-[#24020E]/15 text-[#24020E]",
    iconColor: "text-[#C84B31]",
    tilt: 1.2,
  },
  {
    code: "03",
    badge: "All-in-One Palette",
    title: "From Lens to Table Under One Roof",
    shortPerk: "Photography, venues, decor, catering, styling & fashion",
    description:
      "Pair photographers, venues, florists, caterers, stylists, and attire studios side by side without juggling scattered DMs across five apps.",
    metric: "6 Core Wedding Disciplines",
    icon: Compass,
    accentClass: "bg-[#E3F6F5]/85 border-teal-800/20 text-teal-950",
    iconColor: "text-teal-700",
    tilt: -1,
  },
  {
    code: "04",
    badge: "Dedicated Pros",
    title: "Built for Serious Wedding Makers",
    shortPerk: "Direct studio calendars, packages & replies",
    description:
      "Studios manage their own calendars, packages, and client requests directly—meaning faster replies and details tailored to your celebration.",
    metric: "Direct Studio Response",
    icon: BadgeCheck,
    accentClass: "bg-[#FFF4F7]/95 border-[#24020E]/15 text-[#24020E]",
    iconColor: "text-[#C84B31]",
    tilt: 1,
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: "Step 01",
    title: "Explore & Filter Your Vision",
    detail:
      "Browse by category, search by service name, or filter by city and budget to shortlist matches that fit your ceremony style.",
    checklist: [
      "Filter by category & location",
      "Search & sort packages with ease",
    ],
    tag: "Discover",
    icon: SearchCheck,
  },
  {
    step: "Step 02",
    title: "Inspect Packages & Send a Request",
    detail:
      "Open any service page to view gallery shots, pricing, and studio details, then submit your event date, venue, and notes.",
    checklist: [
      "View multi-photo galleries & rates",
      "Pick ceremony date & venue notes",
    ],
    tag: "Request",
    icon: CalendarHeart,
  },
  {
    step: "Step 03",
    title: "Track & Finalize with Confidence",
    detail:
      "Watch your booking status update in your dashboard—and if plans shift while still pending, cancel or adjust smoothly.",
    checklist: [
      "Live status badges in dashboard",
      "Flexible pending request controls",
    ],
    tag: "Confirm",
    icon: Sparkles,
  },
];

export default function WedPlanEditorialSections() {
  const [activeCard, setActiveCard] = useState<string>("01");
  const [likedCards, setLikedCards] = useState<Record<string, boolean>>({});
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const toggleLike = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedCards((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const currentStep = HOW_IT_WORKS_STEPS[activeStepIndex] ?? HOW_IT_WORKS_STEPS[0];

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative w-full overflow-x-clip py-20 md:py-24"
    >
      {/* Slim Grid Overlay + Blush & Mint Circle Auras */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(36, 2, 14, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(36, 2, 14, 0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          className="absolute inset-0"
        />
        {FADE_AURAS.map((aura) => (
          <motion.div
            key={aura.id}
            animate={{
              x: [0, aura.driftX, 0],
              y: [0, aura.driftY, 0],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: aura.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ background: aura.background }}
            className={`absolute rounded-full blur-2xl ${aura.className}`}
          />
        ))}
      </div>

      <div className="relative z-10 space-y-24">
        {/* SECTION 1: WHY CHOOSE WEDPLAN? (Interactive Ledger + Sticky Note) */}
        <section
          aria-labelledby="why-choose-wedplan-heading"
          className="mx-auto max-w-6xl px-6"
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            {/* Left Sticky Editorial Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="lg:sticky lg:top-28 lg:col-span-5"
            >
              <motion.span
                animate={{ y: [0, -2.5, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5]/90 px-3.5 py-1 text-[10px] font-bold tracking-[0.2em] text-teal-950 uppercase shadow-2xs"
              >
                <Sparkles className="h-3 w-3 text-teal-700" />
                <span>The WedPlan Standard</span>
              </motion.span>

              <h2
                id="why-choose-wedplan-heading"
                style={{ fontFamily: "var(--font-curly), cursive" }}
                className="mt-3 text-4xl leading-[1.1] text-[#24020E] sm:text-5xl"
              >
                Why Choose WedPlan?
              </h2>

              <p className="mt-4 font-[var(--font-cormorant)] text-lg leading-relaxed text-[#24020E]/80 sm:text-xl">
                Planning a wedding shouldn&apos;t feel like herding cats in a
                crowded chatroom. Click any card to pin its highlight or tap the
                heart to save your favorites.
              </p>

              {/* Interactive Spotlight Note */}
              <motion.div
                whileHover={{ rotate: -0.6, y: -2 }}
                transition={{ type: "spring", stiffness: 360, damping: 24 }}
                className="mt-6 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/90 p-5 shadow-xs backdrop-blur-md"
              >
                <AnimatePresence mode="wait">
                  {(() => {
                    const selected =
                      WHY_CHOOSE_ITEMS.find((i) => i.code === activeCard) ??
                      WHY_CHOOSE_ITEMS[0];
                    return (
                      <motion.div
                        key={selected.code}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22 }}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold tracking-[0.18em] text-[#C84B31] uppercase">
                          <span>Spotlight #{selected.code}</span>
                          <span>{selected.metric}</span>
                        </div>
                        <p className="mt-2 font-[var(--font-cormorant)] text-lg italic text-[#24020E]/95">
                          &ldquo;{selected.shortPerk} — {selected.title.toLowerCase()}.&rdquo;
                        </p>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                <div className="mt-3.5 flex items-center justify-between border-t border-[#24020E]/10 pt-3 text-[11px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                  <span>
                    Saved Perks: {Object.values(likedCards).filter(Boolean).length}/4
                  </span>
                  <Link
                    href="/browse-services"
                    className="group/link inline-flex items-center gap-1 text-teal-800 transition hover:text-[#24020E]"
                  >
                    <span>Browse Services</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
                  </Link>
                </div>
              </motion.div>
            </motion.div>

            {/* Right 2x2 Interactive Ledger Cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              {WHY_CHOOSE_ITEMS.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = activeCard === item.code;
                const isLiked = !!likedCards[item.code];

                return (
                  <motion.article
                    key={item.code}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: "some" }}
                    transition={{ duration: 0.42, delay: idx * 0.08 }}
                    whileHover={{
                      y: -5,
                      rotate: item.tilt,
                      transition: { type: "spring", stiffness: 340, damping: 22 },
                    }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setActiveCard(item.code)}
                    className={`group flex cursor-pointer flex-col justify-between rounded-2xl border p-6 shadow-2xs backdrop-blur-md transition-colors ${
                      isSelected
                        ? "border-teal-800/45 bg-[#FFF4F7] ring-2 ring-teal-700/20"
                        : "border-[#24020E]/15 bg-[#FFF4F7]/85 hover:border-teal-800/30"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase ${item.accentClass}`}
                        >
                          <motion.span
                            className="inline-flex"
                            whileHover={{ rotate: 14, scale: 1.15 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                          >
                            <Icon className={`h-3 w-3 ${item.iconColor}`} />
                          </motion.span>
                          <span>{item.badge}</span>
                        </span>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-widest text-[#24020E]/35">
                            #{item.code}
                          </span>
                          <motion.button
                            type="button"
                            aria-label={`Save ${item.title}`}
                            aria-pressed={isLiked}
                            onClick={(e) => toggleLike(item.code, e)}
                            whileTap={{ scale: 0.8 }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#24020E]/12 bg-[#FCF9F4] text-[#24020E]/65 transition hover:border-[#C84B31]/40 hover:text-[#C84B31]"
                          >
                            <Heart
                              className={`h-3.5 w-3.5 transition-colors ${
                                isLiked
                                  ? "fill-[#C95B78] text-[#C95B78]"
                                  : "text-current"
                              }`}
                            />
                          </motion.button>
                        </div>
                      </div>

                      <h3
                        style={{ fontFamily: "var(--font-curly), cursive" }}
                        className="mt-4 text-2xl leading-snug text-[#24020E] sm:text-3xl"
                      >
                        {item.title}
                      </h3>

                      <p className="mt-2.5 font-[var(--font-cormorant)] text-base leading-relaxed text-[#24020E]/80 sm:text-lg">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#24020E]/10 pt-3 text-[11px] font-semibold tracking-wider text-[#24020E]/65 uppercase">
                      <span>{isSelected ? "Active Pin" : "Promise"}</span>
                      <span className="text-[#C84B31]">{item.metric}</span>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECTION 2: HOW WEDPLAN WORKS (Interactive Step Selector + Animated Flow) */}
        <section
          aria-labelledby="how-wedplan-works-heading"
          className="mx-auto max-w-6xl px-6"
        >
          <div className="rounded-3xl border border-[#24020E]/15 bg-[#E3F6F5]/50 p-6 shadow-2xs backdrop-blur-md sm:p-10">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: "some" }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-2xl text-center"
            >
              <span className="inline-block rounded-full border border-[#24020E]/15 bg-[#FCF9F4] px-3.5 py-1 text-[10px] font-bold tracking-[0.2em] text-[#24020E]/80 uppercase">
                Interactive 3-Step Flow
              </span>
              <h2
                id="how-wedplan-works-heading"
                style={{ fontFamily: "var(--font-curly), cursive" }}
                className="mt-3 text-4xl text-[#24020E] sm:text-5xl"
              >
                How WedPlan Works
              </h2>
              <p className="mt-2.5 font-[var(--font-cormorant)] text-lg text-[#24020E]/75 sm:text-xl">
                Tap any stage below to highlight the journey from first spark to
                confirmed booking.
              </p>

              {/* Step Pill Switcher */}
              <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#24020E]/12 bg-[#FCF9F4]/85 p-1.5">
                {HOW_IT_WORKS_STEPS.map((st, idx) => {
                  const isCurrent = activeStepIndex === idx;
                  return (
                    <button
                      key={st.step}
                      type="button"
                      onClick={() => setActiveStepIndex(idx)}
                      className={`relative rounded-xl px-4 py-1.5 text-xs font-bold tracking-wider uppercase transition ${
                        isCurrent
                          ? "text-[#FCF9F4]"
                          : "text-[#24020E]/70 hover:text-[#24020E]"
                      }`}
                    >
                      {isCurrent && (
                        <motion.span
                          layoutId="wedplanStepPill"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 28,
                          }}
                          style={{ backgroundColor: "#24020E" }}
                          className="absolute inset-0 rounded-xl"
                        />
                      )}
                      <span className="relative z-10">
                        0{idx + 1} · {st.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Animated Progress Bar */}
            <div className="mx-auto mt-7 max-w-xl">
              <div className="h-2 w-full overflow-hidden rounded-full border border-[#24020E]/12 bg-[#FCF9F4]">
                <motion.div
                  initial={false}
                  animate={{
                    width: `${((activeStepIndex + 1) / HOW_IT_WORKS_STEPS.length) * 100}%`,
                  }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="h-full rounded-full bg-gradient-to-r from-teal-700 via-teal-600 to-[#C95B78]"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#24020E]/70 uppercase">
                <span>
                  Viewing: {currentStep.step} — {currentStep.title}
                </span>
                <span className="text-teal-900">
                  {Math.round(((activeStepIndex + 1) / HOW_IT_WORKS_STEPS.length) * 100)}% Flow
                </span>
              </div>
            </div>

            <div className="relative mt-8 grid gap-6 md:grid-cols-3">
              {/* Subtle horizontal connector on desktop */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-9 right-[16%] left-[16%] hidden h-px border-t border-dashed border-teal-800/35 md:block"
              />

              {HOW_IT_WORKS_STEPS.map((item, idx) => {
                const Icon = item.icon;
                const isCurrent = activeStepIndex === idx;

                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: "some" }}
                    transition={{ duration: 0.42, delay: idx * 0.1 }}
                    whileHover={{ y: -4 }}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`relative flex cursor-pointer flex-col justify-between rounded-2xl border p-6 transition-all ${
                      isCurrent
                        ? "border-teal-800/45 bg-[#FCF9F4] shadow-md ring-2 ring-teal-700/20"
                        : "border-[#24020E]/15 bg-[#FCF9F4]/85 shadow-2xs hover:bg-[#FCF9F4]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <motion.div
                          animate={
                            isCurrent
                              ? { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }
                              : { scale: 1, rotate: 0 }
                          }
                          transition={{ duration: 2.8, repeat: isCurrent ? Infinity : 0, ease: "easeInOut" }}
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-2xs ${
                            isCurrent
                              ? "border-teal-800/30 bg-[#E3F6F5] text-teal-950"
                              : "border-[#24020E]/12 bg-[#FFF4F7] text-[#24020E]/80"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </motion.div>
                        <span className="rounded-full border border-[#24020E]/12 bg-[#FFF4F7] px-3 py-1 text-[10px] font-bold tracking-wider text-[#24020E]/75 uppercase">
                          {item.step} · {item.tag}
                        </span>
                      </div>

                      <h3
                        style={{ fontFamily: "var(--font-curly), cursive" }}
                        className="mt-5 text-2xl text-[#24020E] sm:text-3xl"
                      >
                        {item.title}
                      </h3>

                      <p className="mt-2 font-[var(--font-cormorant)] text-base leading-relaxed text-[#24020E]/80 sm:text-lg">
                        {item.detail}
                      </p>
                    </div>

                    <ul className="mt-4 space-y-1.5 border-t border-[#24020E]/10 pt-3.5 text-xs font-medium text-[#24020E]/80">
                      {item.checklist.map((point) => (
                        <li key={point} className="flex items-center gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#E3F6F5] text-teal-900">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
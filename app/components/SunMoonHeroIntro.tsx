"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, SkipForward, Sparkles } from "lucide-react";

const INTRO_STORAGE_KEY = "wedplan_hero_intro_completed";
const SCROLL_CUE_STORAGE_KEY = "wedplan_scroll_cue_seen";

type HeroPhase = "checking" | "intro" | "completed";

interface SunMoonHeroIntroProps {
  /** Match this fill to the background color of the section immediately below the hero */
  waveFill?: string;
}

const WAVE_PATH =
  "M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z";

const GRID_WAVE_STYLE: React.CSSProperties = {
  backgroundColor: "#FCF9F4",
  backgroundImage:
    "linear-gradient(to right, rgba(36, 2, 14, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(36, 2, 14, 0.04) 1px, transparent 1px)",
  backgroundSize: "28px 28px",
};

function StageGridBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={GRID_WAVE_STYLE}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(255, 224, 232, 0.65) 0%, transparent 72%)",
        }}
        className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
      />
      <div
        style={{
          background:
            "radial-gradient(circle, rgba(186, 238, 233, 0.58) 0%, transparent 72%)",
        }}
        className="absolute right-[-90px] bottom-8 h-[440px] w-[440px] rounded-full blur-3xl"
      />
    </div>
  );
}

export default function SunMoonHeroIntro({
  waveFill: _waveFill = "#FCF9F4",
}: SunMoonHeroIntroProps) {
  const clipUid = useId().replace(/:/g, "");
  const [phase, setPhase] = useState<HeroPhase>("checking");
  const [showScrollCue, setShowScrollCue] = useState(false);

  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    try {
      const introDone = window.localStorage.getItem(INTRO_STORAGE_KEY) === "true";
      const scrollCueSeen =
        window.localStorage.getItem(SCROLL_CUE_STORAGE_KEY) === "true";

      if (introDone) {
        setPhase("completed");
        setShowScrollCue(false);
      } else {
        setPhase("intro");
        setShowScrollCue(!scrollCueSeen);
      }
    } catch {
      setPhase("intro");
      setShowScrollCue(false);
    }
  }, []);

  // Lock scrolling while intro clip is playing
  useEffect(() => {
    if (phase === "intro") {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [phase]);

  // Hide the one-time indicator once the user scrolls during that first visit
  useEffect(() => {
    if (phase !== "completed" || !showScrollCue) return;

    const handleFirstScroll = () => {
      if (window.scrollY > 30) {
        setShowScrollCue(false);
      }
    };

    window.addEventListener("scroll", handleFirstScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleFirstScroll);
  }, [phase, showScrollCue]);

  const finishIntroForever = () => {
    try {
      const alreadySeenCue =
        window.localStorage.getItem(SCROLL_CUE_STORAGE_KEY) === "true";

      window.localStorage.setItem(INTRO_STORAGE_KEY, "true");
      window.localStorage.setItem(SCROLL_CUE_STORAGE_KEY, "true");

      // Show only once on this very first entry; never on subsequent visits/reloads
      setShowScrollCue(!alreadySeenCue);
    } catch {
      setShowScrollCue(false);
    }
    setPhase("completed");
  };

  const handleSkipClick = () => {
    if (phase !== "intro") return;
    if (introVideoRef.current) {
      introVideoRef.current.pause();
    }
    finishIntroForever();
  };

  if (phase === "checking") {
    return (
      <section
        className="relative min-h-[600px] h-[82svh] max-h-[960px] w-full sm:h-[88svh]"
        aria-hidden="true"
      />
    );
  }

  return (
    <section className="relative w-full overflow-hidden">
      <AnimatePresence mode="sync">
        {/* 1. Full Intro Video inside Vintage Memory Frame */}
        {phase === "intro" && (
          <motion.div
            key="intro-stage"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center gap-3 p-4 select-none"
          >
            <StageGridBackdrop />

            <div className="relative z-10 text-center">
              <p className="text-[10px] font-bold tracking-[0.22em] text-teal-800 uppercase">
                WedPlan Keepsake Curtain
              </p>
              <h2
                style={{ fontFamily: "var(--font-curly), cursive" }}
                className="text-2xl text-[#24020E] sm:text-3xl"
              >
                Sun &amp; Moon Wedding Intro
              </h2>
            </div>

            <div className="relative z-10 flex aspect-[16/10] w-[84vw] max-w-[740px] items-center justify-center sm:w-[78vw]">
              <img
                src="/assets/frame.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full object-fill"
              />

              <div className="relative z-10 flex h-full w-full items-center justify-center px-[13%] py-[10.5%] sm:px-[12.5%] sm:py-[10%]">
                <video
                  ref={introVideoRef}
                  src="/assets/intro.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onEnded={finishIntroForever}
                  onError={finishIntroForever}
                  className="max-h-full max-w-full rounded-md object-contain"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkipClick}
              style={{ backgroundColor: "rgba(36, 2, 14, 0.82)" }}
              className="fixed right-6 bottom-6 z-50 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white shadow-sm backdrop-blur-md transition hover:bg-teal-800"
            >
              <span>Skip</span>
              <SkipForward className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* 2. Responsive Hero Banner + Downward/Left-Adjusted Picture + Lower Glassmorphic Circles */}
        {phase === "completed" && (
          <motion.div
            key="completed-hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative min-h-[600px] h-[82svh] max-h-[960px] w-full overflow-hidden sm:h-[88svh]"
          >
            {/* Shared ClipPath Definition for Both Grid Waves */}
            <svg
              width="0"
              height="0"
              aria-hidden="true"
              className="pointer-events-none absolute"
            >
              <defs>
                <clipPath
                  id={`hero-grid-wave-${clipUid}`}
                  clipPathUnits="objectBoundingBox"
                >
                  <path
                    d={WAVE_PATH}
                    transform="scale(0.0008333333333333334, 0.008333333333333333)"
                  />
                </clipPath>
              </defs>
            </svg>

            {/* Hero illustration shifted slightly down & left so navbar doesn't cover top */}
            <img
              src="/assets/hero.png"
              alt="Vintage bride and groom wedding illustration"
              style={{ objectPosition: "34% 62%" }}
              className="h-full w-full -translate-x-6 translate-y-6 scale-[1.12] object-cover sm:-translate-x-12 sm:translate-y-8 md:-translate-x-16 md:translate-y-10"
            />

            {/* Swaying Flower Bouquet on the Left Side */}
            <div className="pointer-events-none absolute top-[54%] left-1 z-30 -translate-y-1/2 sm:left-4 md:left-7">
              <motion.div
                animate={{
                  rotate: [-5.5, 5.5, -5.5],
                  x: [-4, 4, -4],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ transformOrigin: "50% 82%" }}
                className="w-24 sm:w-40 md:w-52 lg:w-60"
              >
                <img
                  src="/assets/flower.png"
                  alt=""
                  className="h-auto w-full object-contain"
                />
              </motion.div>
            </div>

            {/* Glassmorphic Layered Circles Shifted Down Below Navbar + Responsive Across Viewports */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex h-[86%] items-center justify-center pt-12 md:inset-y-0 md:inset-x-auto md:right-0 md:h-full md:justify-end md:pt-14">
              {/* Layer 1 (Largest): Glassmorphic Warm Beige */}
              <motion.div
                initial={{ x: "110%", opacity: 0 }}
                animate={{ x: "0%", opacity: 1 }}
                transition={{
                  duration: 0.55,
                  delay: 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(232, 209, 167, 0.58) 0%, rgba(232, 209, 167, 0.34) 100%)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.55)",
                  boxShadow: "-10px 0 30px rgba(36, 2, 14, 0.08)",
                }}
                className="absolute translate-y-5 h-[430px] w-[430px] rounded-full sm:h-[540px] sm:w-[540px] md:-right-36 md:translate-y-7 md:h-[620px] md:w-[620px] lg:-right-44 lg:h-[710px] lg:w-[710px]"
              />

              {/* Layer 2 (Medium): Glassmorphic Soft Mint Blue */}
              <motion.div
                initial={{ x: "110%", opacity: 0 }}
                animate={{ x: "0%", opacity: 1 }}
                transition={{
                  duration: 0.52,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(205, 232, 223, 0.65) 0%, rgba(205, 232, 223, 0.42) 100%)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.65)",
                  boxShadow: "-8px 0 26px rgba(36, 2, 14, 0.09)",
                }}
                className="absolute translate-y-5 h-[375px] w-[375px] rounded-full sm:h-[470px] sm:w-[470px] md:-right-32 md:translate-y-7 md:h-[540px] md:w-[540px] lg:-right-40 lg:h-[620px] lg:w-[620px]"
              />

              {/* Layer 3 (Smallest / Top): Glassmorphic Soft Pink (#FFEDF1) */}
              <motion.div
                initial={{ x: "110%", opacity: 0 }}
                animate={{ x: "0%", opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255, 237, 241, 0.82) 0%, rgba(255, 237, 241, 0.62) 100%)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.78)",
                  boxShadow:
                    "-6px 0 22px rgba(36, 2, 14, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
                }}
                className="relative flex translate-y-5 h-[320px] w-[320px] items-center justify-center rounded-full px-6 text-center sm:h-[400px] sm:w-[400px] sm:px-10 md:-right-28 md:translate-y-7 md:h-[460px] md:w-[460px] md:justify-start md:pr-24 md:pl-12 md:text-left lg:-right-36 lg:h-[530px] lg:w-[530px] lg:pr-32 lg:pl-16"
              >
                {/* Hero Text & CTA Fitting Comfortably Inside the Glass Arc */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.52, ease: "easeOut" }}
                  style={{ color: "#24020E" }}
                  className="pointer-events-auto w-full max-w-[225px] sm:max-w-[270px] md:max-w-[295px]"
                >
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.55)",
                      color: "#24020E",
                      borderColor: "rgba(36, 2, 14, 0.18)",
                      backdropFilter: "blur(8px)",
                    }}
                    className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wider sm:mb-2 sm:text-[11px]"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span className="font-[var(--font-cormorant)] text-xs italic sm:text-sm">
                      wedplan vows &amp; moments
                    </span>
                  </div>

                  <h1
                    style={{
                      color: "#24020E",
                      fontFamily: "var(--font-curly), cursive",
                    }}
                    className="font-curly text-2xl leading-[1.12] font-normal tracking-normal sm:text-4xl lg:text-5xl"
                  >
                    WedPlan
                  </h1>

                  <p
                    style={{ color: "#24020E" }}
                    className="mt-1 font-[var(--font-cormorant)] text-sm leading-snug font-semibold italic sm:text-lg lg:text-xl"
                  >
                    Every vow &amp; venue in one place.
                  </p>

                  <p
                    style={{ color: "rgba(36, 2, 14, 0.88)" }}
                    className="mt-1 font-[var(--font-cormorant)] text-xs leading-snug font-medium sm:mt-1.5 sm:text-sm lg:text-base"
                  >
                    Discover services, request bookings, and plan your day.
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <Link
                      href="/services"
                      style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
                      className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition hover:opacity-90 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Explore Services
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Layered Grid Wave Border + Main Grid Wave Divider */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 translate-y-[18px] leading-[0]">
              {/* Top Grid Wave Rim */}
              <div
                aria-hidden="true"
                style={{
                  ...GRID_WAVE_STYLE,
                  clipPath: `url(#hero-grid-wave-${clipUid})`,
                  WebkitClipPath: `url(#hero-grid-wave-${clipUid})`,
                }}
                className="relative block h-[85px] w-[calc(115%+1.3px)] -translate-y-2 sm:h-[110px] sm:-translate-y-3"
              />

              {/* Main Grid Wave Overlapping Below the Top Rim */}
              <div
                aria-hidden="true"
                style={{
                  ...GRID_WAVE_STYLE,
                  clipPath: `url(#hero-grid-wave-${clipUid})`,
                  WebkitClipPath: `url(#hero-grid-wave-${clipUid})`,
                }}
                className="pointer-events-none absolute inset-0 block h-[85px] w-[calc(115%+1.3px)] translate-y-1 sm:h-[110px] sm:translate-y-1.5"
              />
            </div>

            {/* One-time Scroll Down Indicator (only shown once on very first entry) */}
            <AnimatePresence>
              {showScrollCue && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="pointer-events-none absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-full bg-[#24020E]/75 px-4 py-2 text-xs tracking-widest text-[#FFEDF1] uppercase backdrop-blur-sm sm:bottom-16"
                >
                  <span>Scroll Down</span>
                  <motion.div
                    animate={{ y: [0, 5, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
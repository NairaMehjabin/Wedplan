"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, SkipForward, Sparkles } from "lucide-react";

const INTRO_STORAGE_KEY = "wedplan_hero_intro_completed";
const SCROLL_CUE_STORAGE_KEY = "wedplan_scroll_cue_seen";

type HeroPhase = "checking" | "intro" | "skipping" | "completed";

interface SunMoonHeroIntroProps {
  /** Match this fill to the background color of the section immediately below the hero */
  waveFill?: string;
}

export default function SunMoonHeroIntro({
  waveFill = "#F4E2E6",
}: SunMoonHeroIntroProps) {
  const [phase, setPhase] = useState<HeroPhase>("checking");
  const [showScrollCue, setShowScrollCue] = useState(false);

  const introVideoRef = useRef<HTMLVideoElement | null>(null);
  const skipVideoRef = useRef<HTMLVideoElement | null>(null);

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

  // Lock scrolling while intro or skipping clip is playing
  useEffect(() => {
    const shouldLockScroll = phase === "intro" || phase === "skipping";

    if (shouldLockScroll) {
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
    setPhase("skipping");
  };

  if (phase === "checking") {
    return (
      <section
        className="relative h-[84vh] min-h-[620px] max-h-[940px] w-full sm:h-[88vh]"
        aria-hidden="true"
      />
    );
  }

  return (
    <section className="relative w-full overflow-hidden">
      <AnimatePresence mode="sync">
        {/* 1. Full 16s Intro Video inside Vintage Memory Frame */}
        {phase === "intro" && (
          <motion.div
            key="intro-stage"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ backgroundColor: "#24020E" }}
            className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center p-4 select-none"
          >
            <div className="relative flex aspect-[16/10] w-[95vw] max-w-[920px] items-center justify-center">
              <img
                src="/assets/frame.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-fill shadow-2xl"
              />

              <div className="relative z-10 flex h-full w-full items-center justify-center p-[7.2%] sm:p-[6.8%]">
                <video
                  ref={introVideoRef}
                  src="/assets/intro.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onEnded={finishIntroForever}
                  onError={finishIntroForever}
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSkipClick}
              style={{ backgroundColor: "rgba(36, 2, 14, 0.78)" }}
              className="fixed right-6 bottom-6 z-50 inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white hover:text-[#24020E]"
            >
              <span>Skip</span>
              <SkipForward className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {/* 2. Skipped Curtain Video inside Vintage Memory Frame */}
        {phase === "skipping" && (
          <motion.div
            key="skipping-stage"
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            style={{ backgroundColor: "#24020E" }}
            className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center p-4 select-none"
          >
            <div className="relative flex aspect-[16/10] w-[95vw] max-w-[920px] items-center justify-center">
              <img
                src="/assets/frame.png"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-fill shadow-2xl"
              />

              <div className="relative z-10 flex h-full w-full items-center justify-center p-[7.2%] sm:p-[6.8%]">
                <video
                  ref={skipVideoRef}
                  src="/assets/skipped-intro.mp4"
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  onEnded={finishIntroForever}
                  onError={finishIntroForever}
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* 3. Hero Banner + Further Left-Shifted Picture + Glassmorphic Right Half-Circles + Text */}
        {phase === "completed" && (
          <motion.div
            key="completed-hero"
            initial={{ opacity: 0.25 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="relative h-[84vh] min-h-[620px] max-h-[940px] w-full overflow-hidden sm:h-[88vh]"
          >
            {/* Hero illustration shifted further left */}
            <img
              src="/assets/hero.png"
              alt="Vintage bride and groom wedding illustration"
              style={{ objectPosition: "34% 42%" }}
              className="h-full w-full -translate-x-10 -translate-y-7 scale-[1.16] object-cover sm:-translate-x-14 sm:-translate-y-10 md:-translate-x-20"
            />

            {/* Swaying Flower Bouquet on the Left Side */}
            <div className="pointer-events-none absolute top-1/2 left-1 z-30 -translate-y-1/2 sm:left-4 md:left-7">
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
                className="w-32 sm:w-44 md:w-52 lg:w-60"
              >
                <img
                  src="/assets/flower.png"
                  alt=""
                  className="h-auto w-full object-contain drop-shadow-xl"
                />
              </motion.div>
            </div>

            {/* Three Glassmorphic Half-Circles Extending Past Right Screen Edge & Jutting Out Left */}
            <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center justify-end">
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
                className="absolute -right-28 h-[560px] w-[560px] rounded-full sm:-right-36 sm:h-[660px] sm:w-[660px] md:-right-44 md:h-[760px] md:w-[760px]"
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
                className="absolute -right-24 h-[480px] w-[480px] rounded-full sm:-right-32 sm:h-[570px] sm:w-[570px] md:-right-40 md:h-[660px] md:w-[660px]"
              />

              {/* Layer 3 (Smallest / Top): Glassmorphic Soft Pink (#F4E2E6) */}
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
                    "linear-gradient(135deg, rgba(244, 226, 230, 0.76) 0%, rgba(244, 226, 230, 0.56) 100%)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1.5px solid rgba(255, 255, 255, 0.78)",
                  boxShadow:
                    "-6px 0 22px rgba(36, 2, 14, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
                }}
                className="relative -right-20 flex h-[400px] w-[400px] items-center rounded-full pl-10 pr-24 sm:-right-28 sm:h-[480px] sm:w-[480px] sm:pl-14 sm:pr-32 md:-right-36 md:h-[560px] md:w-[560px] md:pl-16 md:pr-40"
              >
                {/* Hero Text & CTA Fitting Comfortably Inside the Inner Half-Circle */}
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.52, ease: "easeOut" }}
                  style={{ color: "#24020E" }}
                  className="pointer-events-auto w-full max-w-[240px] text-left sm:max-w-[270px] md:max-w-[300px]"
                >
                  <div
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.52)",
                      color: "#24020E",
                      borderColor: "rgba(36, 2, 14, 0.18)",
                      backdropFilter: "blur(8px)",
                    }}
                    className="mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wider"
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
                    className="font-curly text-3xl leading-[1.12] font-normal tracking-normal sm:text-5xl"
                  >
                    WedPlan
                  </h1>

                  <p
                    style={{ color: "#24020E" }}
                    className="mt-1 font-[var(--font-cormorant)] text-base leading-snug font-semibold italic sm:text-xl"
                  >
                    Every vow &amp; venue in one place.
                  </p>

                  <p
                    style={{ color: "rgba(36, 2, 14, 0.88)" }}
                    className="mt-1.5 font-[var(--font-cormorant)] text-sm leading-snug font-medium sm:text-base"
                  >
                    Discover services, request bookings, and plan your day.
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <Link
                      href="/services"
                      style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
                      className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition hover:opacity-90 active:scale-[0.98] sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Explore Services
                    </Link>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Bottom SVG Wave Divider */}
            <div className="pointer-events-none absolute right-0 bottom-0 left-0 z-20 translate-y-[18px] overflow-hidden leading-[0]">
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                className="relative block h-[85px] w-[calc(115%+1.3px)] sm:h-[110px]"
                style={{ fill: waveFill }}
              >
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
              </svg>
            </div>

            {/* One-time Scroll Down Indicator (only shown once on very first entry) */}
            <AnimatePresence>
              {showScrollCue && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className="pointer-events-none absolute bottom-14 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-full bg-[#24020E]/75 px-4 py-2 text-xs tracking-widest text-[#F4E2E6] uppercase backdrop-blur-sm sm:bottom-16"
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
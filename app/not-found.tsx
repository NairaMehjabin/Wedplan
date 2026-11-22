"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Compass,
  Heart,
  Home,
  Sparkles,
  Store,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-x-clip px-4 pt-28 pb-20 sm:px-6"
    >
      {/* Slim Grid Overlay + Subtle Blush & Mint Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(36, 2, 14, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(36, 2, 14, 0.04) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(255, 224, 232, 0.62) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.55) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-8 h-[440px] w-[440px] rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="rounded-3xl border border-[#24020E]/15 bg-white/75 p-7 text-center shadow-sm backdrop-blur-md sm:p-12">
          {/* Top Keepsake Pill */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-800/25 bg-[#E3F6F5]/85 px-4 py-1.5 text-[11px] font-semibold tracking-wider text-teal-950 uppercase shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-teal-700" />
            <span>Error 404 • Uncharted Page</span>
          </div>

          {/* Decorative 404 Numeral */}
          <div className="relative mx-auto mb-2 flex items-center justify-center">
            <span
              style={{ fontFamily: "var(--font-curly), cursive" }}
              className="select-none text-7xl leading-none text-[#24020E] sm:text-8xl"
            >
              4
            </span>
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="mx-2 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7] shadow-xs sm:h-20 sm:w-20"
            >
              <Heart className="h-8 w-8 fill-[#C95B78] text-[#C95B78] sm:h-9 sm:w-9" />
            </motion.span>
            <span
              style={{ fontFamily: "var(--font-curly), cursive" }}
              className="select-none text-7xl leading-none text-[#24020E] sm:text-8xl"
            >
              4
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="mt-3 text-3xl leading-tight text-[#24020E] sm:text-5xl"
          >
            This Page Missed the Aisle
          </h1>

          {/* Editorial Subcopy */}
          <p className="mx-auto mt-3 max-w-lg font-[var(--font-cormorant)] text-xl leading-relaxed font-medium text-[#24020E]/80 sm:text-2xl">
            The invitation link you followed may have moved, expired, or never
            made it into the wedding ledger.
          </p>

          {/* Keepsake Quote Box */}
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[#24020E]/12 bg-[#FFF4F7]/85 px-5 py-4 text-left shadow-2xs">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                Atelier Note
              </span>
              <Compass className="h-3.5 w-3.5 text-[#C84B31]" />
            </div>
            <p className="font-[var(--font-cormorant)] text-base italic text-[#24020E]/80">
              &ldquo;Even when a path wanders off the itinerary, the celebration
              is always just a step away.&rdquo;
            </p>
          </div>

          {/* Primary Actions */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#24020E] px-6 py-3.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 active:scale-[0.99] sm:w-auto"
            >
              <Home className="h-4 w-4 text-[#99F6E4]" />
              <span>Return to WedPlan Home</span>
            </Link>

            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/90 px-6 py-3.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase shadow-2xs transition hover:bg-[#E3F6F5]/80 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 text-[#C84B31]" />
              <span>Go Back</span>
            </button>
          </div>

          {/* Helpful Quick Links */}
          <div className="mt-7 border-t border-[#24020E]/10 pt-5">
            <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-[#24020E]/55 uppercase">
              Or continue exploring
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs font-semibold">
              <Link
                href="/#services"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#24020E]/12 bg-white/85 px-3.5 py-2 text-[#24020E] transition hover:border-teal-800/35 hover:bg-[#E3F6F5]/75"
              >
                <Store className="h-3.5 w-3.5 text-teal-700" />
                <span>Browse Services</span>
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#24020E]/12 bg-white/85 px-3.5 py-2 text-[#24020E] transition hover:border-teal-800/35 hover:bg-[#E3F6F5]/75"
              >
                <span>Sign In / Register</span>
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
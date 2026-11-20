"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Compass, Sparkles } from "lucide-react";

export default function NotFoundPage() {
  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-x-clip px-4 pt-24 pb-16 sm:px-6 sm:pt-28"
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
              "radial-gradient(circle, rgba(255, 224, 232, 0.58) 0%, transparent 72%)",
          }}
          className="absolute -top-20 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.52) 0%, transparent 72%)",
          }}
          className="absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full blur-3xl"
        />
      </div>

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-7 text-center shadow-sm backdrop-blur-md sm:p-9"
      >
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5]/85 px-3.5 py-1 text-[10px] font-bold tracking-[0.2em] text-teal-950 uppercase">
          <Sparkles className="h-3 w-3 text-teal-700" />
          <span>Error 404</span>
        </div>

        <p className="font-[var(--font-cormorant)] text-6xl font-bold tracking-tight text-[#C84B31] sm:text-7xl">
          404
        </p>

        <h1
          style={{ fontFamily: "var(--font-curly), cursive" }}
          className="mt-2 text-3xl leading-tight text-[#24020E] sm:text-4xl"
        >
          Page not found
        </h1>

        <p className="mx-auto mt-3 max-w-md font-[var(--font-cormorant)] text-lg leading-relaxed text-[#24020E]/80">
          The page or celebration link you are looking for doesn&apos;t exist or
          may have moved.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] px-5 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800"
          >
            <ArrowLeft className="h-4 w-4 text-[#99F6E4]" />
            <span>Back Home</span>
          </Link>

          <Link
            href="/services"
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#24020E]/20 bg-white/85 px-5 py-3 text-xs font-semibold tracking-wider text-[#24020E] uppercase shadow-2xs transition hover:bg-[#E3F6F5]"
          >
            <Compass className="h-4 w-4 text-teal-700" />
            <span>Explore Services</span>
          </Link>
        </div>
      </motion.section>
    </main>
  );
}
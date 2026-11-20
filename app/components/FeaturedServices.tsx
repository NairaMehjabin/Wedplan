"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Heart } from "lucide-react";
import ServiceCard, { type WeddingService } from "./ServiceCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface FeaturedServicesProps {
  isAuthenticated?: boolean;
}

const FADE_AURAS = [
  // Luminous off-white circle auras
  {
    id: "ow-1",
    className: "-top-12 -left-24 h-80 w-80 sm:h-[420px] sm:w-[420px]",
    background:
      "radial-gradient(circle, rgba(252, 249, 244, 0.85) 0%, rgba(252, 249, 244, 0.28) 56%, transparent 76%)",
    driftX: 14,
    driftY: -12,
    duration: 9,
  },
  {
    id: "ow-2",
    className: "top-[42%] right-[-95px] h-80 w-80 sm:h-[440px] sm:w-[440px]",
    background:
      "radial-gradient(circle, rgba(252, 249, 244, 0.8) 0%, rgba(252, 249, 244, 0.24) 58%, transparent 76%)",
    driftX: -16,
    driftY: 14,
    duration: 11,
  },
  {
    id: "ow-3",
    className: "bottom-6 left-[14%] h-72 w-72 sm:h-[380px] sm:w-[380px]",
    background:
      "radial-gradient(circle, rgba(252, 249, 244, 0.82) 0%, rgba(252, 249, 244, 0.22) 56%, transparent 76%)",
    driftX: 12,
    driftY: 10,
    duration: 10,
  },
  // Noticeable darker pink / rose-blush circle auras
  {
    id: "pk-1",
    className: "top-20 right-[6%] h-72 w-72 sm:h-[380px] sm:w-[380px]",
    background:
      "radial-gradient(circle, rgba(232, 155, 174, 0.34) 0%, rgba(217, 122, 148, 0.14) 58%, transparent 76%)",
    driftX: -12,
    driftY: -14,
    duration: 10.5,
  },
  {
    id: "pk-2",
    className: "top-[55%] -left-24 h-80 w-80 sm:h-[430px] sm:w-[430px]",
    background:
      "radial-gradient(circle, rgba(217, 122, 148, 0.3) 0%, rgba(232, 155, 174, 0.12) 60%, transparent 76%)",
    driftX: 15,
    driftY: -10,
    duration: 12,
  },
  {
    id: "pk-3",
    className: "-bottom-16 right-[18%] h-80 w-80 sm:h-[410px] sm:w-[410px]",
    background:
      "radial-gradient(circle, rgba(226, 140, 162, 0.32) 0%, rgba(217, 122, 148, 0.12) 58%, transparent 76%)",
    driftX: -10,
    driftY: -12,
    duration: 9.5,
  },
];

export default function FeaturedServices({
  isAuthenticated = true,
}: FeaturedServicesProps) {
  const [services, setServices] = useState<WeddingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchFeatured() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/api/services?limit=6`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || "Unable to fetch featured services");
        }

        const rawList = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.services)
              ? data.services
              : [];

        if (active) {
          setServices(rawList.filter(Boolean).slice(0, 6));
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error loading services"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchFeatured();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="relative w-full overflow-x-clip py-20 sm:py-28">
      {/* Faded Off-White & Darker Pink Circle Auras */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
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

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Bold, Centered, Stylized Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-14 max-w-3xl text-center sm:mb-16"
        >
          {/* Top Pill Tag */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
            style={{
              backgroundColor: "rgba(252, 249, 244, 0.85)",
              borderColor: "rgba(68, 45, 28, 0.25)",
            }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wider text-[#442D1C] shadow-xs backdrop-blur-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#8C5383]" />
            <span className="font-[var(--font-cormorant)] text-sm italic sm:text-base">
              handpicked keepsakes for your celebration
            </span>
            <Heart className="h-3 w-3 fill-[#C95B78] text-[#C95B78]" />
          </motion.div>

          {/* Stylized Bold Title with Ornamental Flourishes */}
          <div className="relative flex items-center justify-center gap-3 sm:gap-5">
            <motion.span
              animate={{ scaleX: [0.85, 1.08, 0.85], opacity: [0.45, 0.85, 0.45] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
              className="hidden h-[2px] w-14 origin-right rounded-full bg-gradient-to-r from-transparent via-[#442D1C]/50 to-[#24020E] sm:block md:w-24"
            />

            <motion.h2
              animate={{ scale: [1, 1.015, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                fontFamily: "var(--font-curly), cursive",
                textShadow:
                  "0 3px 0 rgba(252, 249, 244, 0.9), 0 10px 24px rgba(68, 45, 28, 0.16)",
              }}
              className="font-curly px-2 text-4xl font-bold tracking-wide text-[#24020E] sm:text-6xl lg:text-[68px]"
            >
              Featured Services
            </motion.h2>

            <motion.span
              animate={{ scaleX: [0.85, 1.08, 0.85], opacity: [0.45, 0.85, 0.45] }}
              transition={{
                duration: 4,
                delay: 0.4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              aria-hidden="true"
              className="hidden h-[2px] w-14 origin-left rounded-full bg-gradient-to-l from-transparent via-[#442D1C]/50 to-[#24020E] sm:block md:w-24"
            />
          </div>

          {/* Decorative Ribbon Divider */}
          <div
            aria-hidden="true"
            className="mx-auto mt-3 flex items-center justify-center gap-2 text-[#442D1C]/70"
          >
            <span className="h-1.5 w-1.5 rotate-45 bg-[#442D1C]/60" />
            <span className="h-[1px] w-16 bg-[#442D1C]/35" />
            <Heart className="h-3.5 w-3.5 fill-[#C95B78]/80 text-[#C95B78]" />
            <span className="h-[1px] w-16 bg-[#442D1C]/35" />
            <span className="h-1.5 w-1.5 rotate-45 bg-[#442D1C]/60" />
          </div>

          <p className="mx-auto mt-4 max-w-xl font-[var(--font-cormorant)] text-lg leading-relaxed font-medium text-[#24020E]/85 sm:text-2xl">
            Approved venues, storytellers, florists, caterers, and bridal
            ateliers curated for unforgettable vows.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/services"
              style={{
                backgroundColor: "#24020E",
                color: "#FCF9F4",
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[#E8D1A7]/40 px-6 py-3 text-xs font-semibold tracking-wide shadow-md transition duration-200 hover:-translate-y-0.5 hover:bg-[#442D1C] sm:text-sm"
            >
              <span>Browse All Services</span>
              <ArrowRight className="h-4 w-4 text-[#E8D1A7]" />
            </Link>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-[440px] animate-pulse rounded-[34px] border-2 border-[#442D1C]/15 bg-[#FCF9F4]/70 p-4"
              >
                <div className="h-64 w-full rounded-[26px] bg-[#442D1C]/10" />
                <div className="mt-5 h-4 w-1/3 rounded-full bg-[#442D1C]/10" />
                <div className="mt-2.5 h-7 w-3/4 rounded-full bg-[#442D1C]/10" />
                <div className="mt-2 h-4 w-full rounded-full bg-[#442D1C]/10" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-[34px] border-2 border-[#442D1C]/20 bg-[#FCF9F4]/90 p-8 text-center shadow-sm">
            <p className="font-[var(--font-cormorant)] text-2xl font-bold text-[#24020E]">
              Couldn&apos;t load featured services
            </p>
            <p className="mt-1 text-sm text-[#24020E]/75">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && services.length === 0 && (
          <div className="rounded-[34px] border-2 border-[#442D1C]/20 bg-[#FCF9F4]/90 p-10 text-center shadow-sm">
            <Heart className="mx-auto mb-2 h-6 w-6 text-[#C95B78]" />
            <p className="font-[var(--font-cormorant)] text-2xl font-bold text-[#24020E]">
              No approved services available yet
            </p>
            <p className="mt-1 text-sm text-[#24020E]/75">
              Run the seed script or approve pending services to display them here.
            </p>
          </div>
        )}

        {/* Cards Grid */}
        {!loading && !error && services.length > 0 && (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {services.map((service, index) => (
              <ServiceCard
                key={service._id}
                service={service}
                index={index}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
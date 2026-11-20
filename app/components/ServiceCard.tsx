"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, Store, ArrowUpRight, Heart } from "lucide-react";

export interface WeddingService {
  _id: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images?: string[];
  vendorName?: string;
  businessName?: string;
  status?: string;
}

interface ServiceCardProps {
  service?: WeddingService | null;
  index?: number;
  /** Pass whether the user is signed in; unauthenticated clicks redirect to /sign-in */
  isAuthenticated?: boolean;
}

const CARD_THEMES = [
  // 0: Warm Off-White
  {
    surface:
      "linear-gradient(160deg, rgba(252, 249, 244, 0.97) 0%, rgba(246, 239, 229, 0.92) 100%)",
    border: "rgba(36, 2, 14, 0.2)",
    innerBorder: "rgba(36, 2, 14, 0.22)",
    textPrimary: "#24020E",
    textSecondary: "rgba(36, 2, 14, 0.8)",
    textMuted: "rgba(36, 2, 14, 0.6)",
    divider: "rgba(36, 2, 14, 0.15)",
    badgeBg: "rgba(252, 249, 244, 0.95)",
    badgeText: "#24020E",
    ctaBg: "#24020E",
    ctaText: "#FCF9F4",
    heartColor: "#C95B78",
  },
  // 1: Soft Mint Blue
  {
    surface:
      "linear-gradient(160deg, rgba(226, 243, 238, 0.97) 0%, rgba(203, 231, 222, 0.92) 100%)",
    border: "rgba(36, 2, 14, 0.2)",
    innerBorder: "rgba(36, 2, 14, 0.22)",
    textPrimary: "#24020E",
    textSecondary: "rgba(36, 2, 14, 0.82)",
    textMuted: "rgba(36, 2, 14, 0.6)",
    divider: "rgba(36, 2, 14, 0.15)",
    badgeBg: "rgba(252, 249, 244, 0.94)",
    badgeText: "#24020E",
    ctaBg: "#24020E",
    ctaText: "#FCF9F4",
    heartColor: "#3D8B7A",
  },
  // 2: Vintage Warm Brown (Rich Latte / Espresso)
  {
    surface:
      "linear-gradient(160deg, rgba(94, 58, 43, 0.97) 0%, rgba(68, 45, 28, 0.95) 100%)",
    border: "rgba(232, 209, 167, 0.45)",
    innerBorder: "rgba(232, 209, 167, 0.35)",
    textPrimary: "#FCF9F4",
    textSecondary: "rgba(252, 249, 244, 0.85)",
    textMuted: "rgba(232, 209, 167, 0.82)",
    divider: "rgba(232, 209, 167, 0.24)",
    badgeBg: "rgba(252, 249, 244, 0.95)",
    badgeText: "#442D1C",
    ctaBg: "#E8D1A7",
    ctaText: "#24020E",
    heartColor: "#8C5383",
  },
];

// Decorative hearts that emerge and frame the card on hover
const FRAMING_HEARTS = [
  { id: "tl", className: "-top-3 -left-2.5", size: "h-5 w-5", rotate: -18, x: -4, y: -4, delay: 0 },
  { id: "tr", className: "-top-3 right-6", size: "h-4 w-4", rotate: 16, x: 4, y: -5, delay: 0.05 },
  { id: "ml", className: "top-1/2 -left-3.5 -translate-y-1/2", size: "h-4 w-4", rotate: -22, x: -5, y: 0, delay: 0.08 },
  { id: "mr", className: "top-1/2 -right-3.5 -translate-y-1/2", size: "h-4 w-4", rotate: 20, x: 5, y: 0, delay: 0.1 },
  { id: "bl", className: "-bottom-3 left-5", size: "h-4 w-4", rotate: -14, x: -3, y: 5, delay: 0.06 },
  { id: "br", className: "-bottom-3 -right-2.5", size: "h-5 w-5", rotate: 18, x: 4, y: 4, delay: 0.03 },
];

export default function ServiceCard({
  service,
  index = 0,
  isAuthenticated = true,
}: ServiceCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  if (!service) return null;

  const theme = CARD_THEMES[index % CARD_THEMES.length];

  const coverImage =
    service.images?.[0] ||
    "https://i.pinimg.com/736x/75/b6/2b/75b62baf81b9aacb79b6338d4df69043.jpg";

  const vendorLabel =
    service.businessName || service.vendorName || "Verified Atelier";

  const detailsHref = `/services/${service._id}`;

  const handleViewDetails = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isAuthenticated) {
      e.preventDefault();
      router.push(`/sign-in?redirect=${encodeURIComponent(detailsHref)}`);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.45,
        delay: Math.min(index * 0.07, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -6 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        background: theme.surface,
        borderColor: theme.border,
        boxShadow:
          "0 16px 34px -10px rgba(36, 2, 14, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
      }}
      className="group relative flex flex-col rounded-[34px] border-2 p-3.5 backdrop-blur-md transition-shadow duration-300 hover:shadow-2xl sm:p-4"
    >
      {/* Animated Hearts Framing the Card on Hover */}
      <AnimatePresence>
        {isHovered &&
          FRAMING_HEARTS.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{
                opacity: 0,
                scale: 0.2,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                opacity: 1,
                scale: [0.9, 1.12, 1],
                x: heart.x,
                y: [heart.y, heart.y - 3, heart.y],
                rotate: heart.rotate,
              }}
              exit={{
                opacity: 0,
                scale: 0.2,
                transition: { duration: 0.18 },
              }}
              transition={{
                duration: 0.34,
                delay: heart.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
              aria-hidden="true"
              className={`pointer-events-none absolute z-30 ${heart.className}`}
            >
              <Heart
                className={`${heart.size} drop-shadow-sm`}
                style={{
                  color: theme.heartColor,
                  fill: theme.heartColor,
                }}
              />
            </motion.div>
          ))}
      </AnimatePresence>

      {/* Chunky Inner Keepsake Frame */}
      <div
        aria-hidden="true"
        style={{ borderColor: theme.innerBorder }}
        className="pointer-events-none absolute inset-[9px] z-20 rounded-[26px] border border-dashed transition-opacity duration-300"
      />

      {/* Top Ornamental Corner Flourish */}
      <div
        aria-hidden="true"
        style={{
          backgroundColor: theme.badgeBg,
          color: theme.badgeText,
        }}
        className="pointer-events-none absolute top-5 right-5 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-[#24020E]/15 shadow-2xs"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </div>

      {/* 1. Service Image */}
      <div className="relative h-64 w-full overflow-hidden rounded-[26px] bg-[#24020E]/10 sm:h-68">
        <img
          src={coverImage}
          alt={service.serviceName || "Wedding Service"}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#24020E]/55 to-transparent"
        />

        {/* 2. Category Badge */}
        <span
          style={{
            backgroundColor: theme.badgeBg,
            color: theme.badgeText,
            borderColor: "rgba(36, 2, 14, 0.16)",
          }}
          className="absolute top-3.5 left-3.5 z-10 inline-flex items-center rounded-full border px-3.5 py-1 text-xs font-semibold tracking-wide shadow-2xs backdrop-blur-xs"
        >
          {service.category}
        </span>

        {/* 3. Location Pill */}
        <span
          style={{
            backgroundColor: "rgba(36, 2, 14, 0.84)",
            color: "#FCF9F4",
          }}
          className="absolute bottom-3.5 left-3.5 z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-medium backdrop-blur-xs"
        >
          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E8D1A7]" />
          <span>{service.location}</span>
        </span>
      </div>

      {/* Card Body */}
      <div className="relative z-10 flex flex-1 flex-col justify-between px-3.5 pt-5 pb-3 sm:px-4">
        <div>
          {/* 4. Vendor Information */}
          <div
            style={{ color: theme.textMuted }}
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
          >
            <Store className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{vendorLabel}</span>
            {service.vendorName &&
              service.businessName &&
              service.vendorName !== service.businessName && (
                <span className="truncate font-normal opacity-80">
                  · {service.vendorName}
                </span>
              )}
          </div>

          {/* 5. Service Name */}
          <h3
            style={{ color: theme.textPrimary }}
            className="font-[var(--font-cormorant)] text-[26px] leading-tight font-bold transition-opacity duration-200 sm:text-[28px]"
          >
            {service.serviceName}
          </h3>

          <p
            style={{ color: theme.textSecondary }}
            className="mt-2 line-clamp-2 text-sm leading-relaxed"
          >
            {service.description}
          </p>
        </div>

        {/* 6. Price & 7. View Details Button */}
        <div
          style={{ borderColor: theme.divider }}
          className="mt-5 flex items-center justify-between gap-3 border-t pt-4"
        >
          <div>
            <span
              style={{ color: theme.textMuted }}
              className="block text-[10px] font-bold tracking-widest uppercase"
            >
              Starting Price
            </span>
            <p
              style={{ color: theme.textPrimary }}
              className="font-[var(--font-cormorant)] text-2xl font-bold sm:text-[26px]"
            >
              ৳{Number(service.price || 0).toLocaleString()}
            </p>
          </div>

          <Link
            href={detailsHref}
            onClick={handleViewDetails}
            style={{
              backgroundColor: theme.ctaBg,
              color: theme.ctaText,
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-5 py-3 text-xs font-semibold shadow-sm transition duration-200 hover:opacity-90 active:scale-[0.98] sm:text-sm"
          >
            <span>View Details</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
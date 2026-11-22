"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUp, Sparkles, Heart, LogOut } from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type FooterUserRole = "customer" | "vendor" | "admin";

export interface FooterUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  image?: string | null;
  role?: FooterUserRole | string;
  isBlocked?: boolean;
}

interface WedPlanFooterProps {
  user?: FooterUser | null;
  onLogout?: () => Promise<void> | void;
}

function getUserId(user?: FooterUser | null): string {
  return String(user?.id || user?._id || "").trim();
}

function normalizeRole(role?: string): FooterUserRole {
  const r = (role || "").trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "vendor") return "vendor";
  return "customer";
}

function getDashboardHref(user?: FooterUser | null): string {
  if (!user) return "/sign-in";
  switch (normalizeRole(user.role)) {
    case "admin":
      return "/dashboard";
    case "vendor":
      return "/dashboard/vendor";
    case "customer":
    default:
      return "/dashboard/customer";
  }
}

function getProfileHref(user?: FooterUser | null): string {
  if (!user) return "/sign-in";
  const id = getUserId(user);
  switch (normalizeRole(user.role)) {
    case "admin":
      return "/profile";
    case "vendor":
      return id ? `/profile/vendor/${encodeURIComponent(id)}` : "/profile/vendor";
    case "customer":
    default:
      return id
        ? `/profile/customer/${encodeURIComponent(id)}`
        : "/profile/customer";
  }
}

function readStoredUser(): FooterUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FooterUser;
    if (!parsed?.email && !parsed?.name && !parsed?.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

const titleLetters = "Wed".split("");
const titleAccentLetters = "Plan".split("");

const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const letterVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
} as const;

function WedPlanFooterInner({
  user: propUser,
  onLogout,
}: WedPlanFooterProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<FooterUser | null>(
    propUser ?? null
  );
  const [loggingOut, setLoggingOut] = useState(false);

  const syncUser = useCallback(async () => {
    if (propUser !== undefined) {
      setCurrentUser(propUser);
      return;
    }

    const cached = readStoredUser();
    setCurrentUser(cached);

    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("wedplan_token");
    if (!token) {
      setCurrentUser(null);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.localStorage.removeItem("wedplan_token");
          window.localStorage.removeItem("wedplan_user");
          setCurrentUser(null);
        }
        return;
      }
      const data = await res.json();
      if (data?.success && data?.user) {
        window.localStorage.setItem("wedplan_user", JSON.stringify(data.user));
        setCurrentUser(data.user);
      }
    } catch {
      // Keep cached user on transient network issues
    }
  }, [propUser]);

  useEffect(() => {
    const handleAuthSync = () => {
      setCurrentUser(readStoredUser());
      void syncUser();
    };

    handleAuthSync();
    window.addEventListener("wedplan-auth-changed", handleAuthSync);
    window.addEventListener("storage", handleAuthSync);
    return () => {
      window.removeEventListener("wedplan-auth-changed", handleAuthSync);
      window.removeEventListener("storage", handleAuthSync);
    };
  }, [pathname, syncUser]);

  const handleLogoutClick = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setCurrentUser(null);
    toast("You have been logged out.", { icon: "👋" });
    router.replace("/sign-in");
    router.refresh();

    try {
      if (onLogout) {
        await onLogout();
      } else {
        await fetch(`${API_BASE}/api/auth/sign-out`, {
          method: "POST",
          credentials: "include",
        }).catch(() => null);
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isAuthenticated = Boolean(currentUser);
  const isBlocked = Boolean(currentUser?.isBlocked);
  const canAccessPrivate = isAuthenticated && !isBlocked;
  const role = normalizeRole(currentUser?.role);
  const dashboardHref = getDashboardHref(currentUser);
  const profileHref = getProfileHref(currentUser);

  const initials = (currentUser?.name || "W")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const navCapsules = canAccessPrivate
    ? [
        { label: "Home", href: "/" },
        { label: "Browse Services", href: "/browse-services" },
        { label: "Dashboard", href: dashboardHref },
        { label: "Profile", href: profileHref },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Browse Services", href: "/browse-services" },
      ];

  return (
    <footer className="relative mt-20 w-full select-none overflow-visible bg-[#24020E] pt-12 pb-8 text-[#FFEDF1]">
      {/* THE WAVE RIDGE */}
      <div className="pointer-events-none absolute top-0 left-0 h-[70px] w-full -translate-y-[68px] overflow-hidden leading-[0]">
        <svg
          className="relative block h-full w-full"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M0,64 C150,140 300,10 450,70 C600,130 750,20 900,80 C1050,140 1150,50 1200,64 L1200,120 L0,120 Z"
            fill="#24020E"
          />
        </svg>
      </div>

      {/* Soft Decorative Accents */}
      <motion.div
        animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -top-12 left-[12%] hidden h-8 w-8 rounded-full bg-[#FFEDF1]/10 blur-[1px] sm:block"
      />
      <motion.div
        animate={{ y: [0, -10, 0], scale: [1, 0.95, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="pointer-events-none absolute -top-16 right-[15%] hidden h-12 w-12 rounded-full bg-[#CDE8DF]/15 blur-[2px] sm:block"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        {/* MAIN BODY LAYOUT */}
        <div className="flex flex-col justify-between gap-8 border-b border-[#FFEDF1]/15 pb-10 md:flex-row md:items-center">
          {/* Brand Info & Animated Bouncy Title */}
          <div className="flex max-w-sm flex-col items-start gap-2.5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FFEDF1]/10 bg-[#FFEDF1]/10 px-3 py-1 text-[10px] font-bold tracking-wider text-[#FFEDF1]">
              <Sparkles className="h-3 w-3 text-[#CDE8DF]" />
              <span>
                {isAuthenticated
                  ? isBlocked
                    ? "Account Suspended"
                    : `${role.charAt(0).toUpperCase() + role.slice(1)} Lounge`
                  : "Bridal & Vendor Lounge"}
              </span>
            </div>

            <motion.h3
              className="flex cursor-default flex-wrap text-3xl font-black tracking-tight text-white select-none"
              style={{ fontFamily: "var(--font-curly), cursive" }}
              variants={containerVariants}
              initial="initial"
              animate="animate"
            >
              <span className="mr-2 flex">
                {titleLetters.map((letter, index) => (
                  <motion.span
                    key={index}
                    variants={letterVariants}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
              <span className="flex text-[#CDE8DF]">
                {titleAccentLetters.map((letter, index) => (
                  <motion.span
                    key={index}
                    variants={letterVariants}
                    className="inline-block"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            </motion.h3>

            <p className="text-xs leading-relaxed font-medium text-[#FFEDF1]/80">
              {isAuthenticated
                ? `Signed in as ${currentUser?.name || "Member"} (${role}) — ready for effortless wedding planning and bookings.`
                : "A warm, curated wedding planning space for couples, stylists, and vendors. Sign in to access your dashboard and profile."}
            </p>
          </div>

          {/* Navigation Capsules */}
          <div className="flex flex-col justify-center gap-3">
            <span className="text-[10px] font-black tracking-widest text-[#FFEDF1]/50 uppercase">
              {canAccessPrivate ? "Your Navigation" : "Explore Sanctuary"}
            </span>
            <div className="flex max-w-xs flex-wrap gap-2">
              {navCapsules.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="inline-block rounded-full bg-[#FFEDF1] px-3 py-1.5 text-center text-xs font-bold text-[#24020E] decoration-transparent shadow-xs transition hover:-translate-y-0.5 hover:bg-[#CDE8DF]"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Profile or Sign In / Sign Up */}
          <div className="flex flex-col items-start justify-center gap-3 md:items-end">
            <span className="w-full text-[10px] font-black tracking-widest text-[#FFEDF1]/50 uppercase md:text-right">
              {isAuthenticated ? "Member Profile" : "Member Access"}
            </span>

            {isAuthenticated ? (
              <div className="flex items-center gap-2 rounded-full border border-[#FFEDF1]/20 bg-[#FFEDF1] py-1.5 pr-2 pl-2 text-[#24020E] shadow-md">
                <Link
                  href={profileHref}
                  className="flex items-center gap-2 rounded-full pr-1 transition hover:opacity-85"
                >
                  {currentUser?.image ? (
                    <img
                      src={currentUser.image}
                      alt={currentUser.name || "Profile"}
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-[#24020E]/20"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#24020E] text-[11px] font-black text-[#FFEDF1]">
                      {initials}
                    </span>
                  )}
                  <div className="pr-1 text-left leading-tight">
                    <p className="max-w-[110px] truncate text-xs font-bold text-[#24020E]">
                      {currentUser?.name || "Member"}
                    </p>
                    <p className="text-[10px] font-semibold text-[#24020E]/65 capitalize">
                      {isBlocked ? "blocked" : role}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  disabled={loggingOut}
                  title="Log out"
                  aria-label="Log out"
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#24020E] text-[#FFEDF1] transition hover:bg-teal-800 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href={`/sign-in?redirect=${encodeURIComponent(
                    pathname || "/"
                  )}`}
                  className="inline-flex items-center justify-center rounded-full bg-[#FFEDF1] px-4 py-2 text-xs font-bold text-[#24020E] shadow-xs transition hover:-translate-y-0.5 hover:bg-[#CDE8DF]"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-full border border-[#FFEDF1]/25 bg-[#FFEDF1]/15 px-4 py-2 text-xs font-bold text-[#FFEDF1] transition hover:-translate-y-0.5 hover:bg-[#FFEDF1]/25"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM UTILITY ROW */}
        <div className="flex flex-col items-center justify-between gap-4 pt-6 sm:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-1 text-center text-[10px] font-bold text-[#FFEDF1]/70 sm:justify-start sm:text-left">
            <span>© 2026 WedPlan.</span>
            <span className="flex items-center gap-0.5">
              Bubbly, soft, and crafted with{" "}
              <Heart className="h-2.5 w-2.5 fill-[#CDE8DF] text-[#CDE8DF]" />{" "}
              in Rajshahi.
            </span>
          </div>

          <motion.button
            type="button"
            onClick={scrollToTop}
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.95 }}
            className="group flex cursor-pointer items-center gap-1.5 rounded-full bg-[#FFEDF1] px-4 py-2 text-[10px] font-black text-[#24020E] uppercase shadow-sm hover:bg-[#CDE8DF]"
          >
            <span>Back to Top</span>
            <ArrowUp className="h-3 w-3 stroke-[3] transition-transform group-hover:-translate-y-0.5" />
          </motion.button>
        </div>
      </div>
    </footer>
  );
}

export default function WedPlanFooter(props: WedPlanFooterProps) {
  return (
    <Suspense fallback={null}>
      <WedPlanFooterInner {...props} />
    </Suspense>
  );
}
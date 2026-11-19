"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

export type UserRole = "customer" | "vendor" | "admin";

export interface NavbarUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  isBlocked?: boolean;
}

interface NavbarProps {
  /** Pass the current Better Auth / session user; updates navbar immediately when changed */
  user?: NavbarUser | null;
  /** Optional sign-out handler; if omitted, calls /api/auth/sign-out and refreshes */
  onLogout?: () => Promise<void> | void;
}

function getDashboardHref(role?: UserRole): string {
  switch (role) {
    case "admin":
      return "/dashboard/admin";
    case "vendor":
      return "/dashboard/vendor";
    case "customer":
    default:
      return "/dashboard/customer";
  }
}

export default function Navbar({ user = null, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close profile dropdown on outside click or route change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDropdownOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleLogoutClick = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          credentials: "include",
        });
      }
      setDropdownOpen(false);
      setMobileOpen(false);
      router.refresh();
      router.push("/sign-in");
    } finally {
      setLoggingOut(false);
    }
  };

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Browse Services", href: "/services" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  const initials = (user?.name || "W")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="fixed top-3 right-0 left-0 z-40 mx-auto w-full max-w-6xl px-3 sm:px-6">
      {/* Unique Vintage Keepsake-Ribbon Glassmorphic Shell */}
      <div
        style={{
          background:
            "linear-gradient(120deg, rgba(244, 226, 230, 0.84) 0%, rgba(232, 209, 167, 0.56) 52%, rgba(205, 232, 223, 0.62) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1.5px solid rgba(36, 2, 14, 0.16)",
          boxShadow:
            "0 10px 30px rgba(36, 2, 14, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.75)",
        }}
        className="relative rounded-[28px] px-4 py-2.5 sm:px-6"
      >
        {/* Subtle inner lace-stitch frame accent */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[4px] rounded-[24px] border border-dashed border-[#24020E]/15"
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          {/* Logo / Name: WedPlan */}
          <Link
            href="/"
            style={{ color: "#24020E" }}
            className="group inline-flex items-center gap-2 focus:outline-none"
          >
            <span
              style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
              className="flex h-9 w-9 items-center justify-center rounded-full shadow-xs transition-transform duration-300 group-hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
            </span>
            <span
              style={{
                color: "#24020E",
                fontFamily: "var(--font-curly), cursive",
              }}
              className="font-curly text-2xl leading-none font-normal sm:text-3xl"
            >
              WedPlan
            </span>
          </Link>

          {/* Desktop Center/Right Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hidden items-center gap-2 md:flex"
          >
            {navLinks.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={
                    active
                      ? { backgroundColor: "#24020E", color: "#F4E2E6" }
                      : { color: "#24020E" }
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "shadow-xs"
                      : "hover:bg-[#24020E]/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Auth State Switcher: Public vs Authenticated */}
            {!user ? (
              <div className="ml-2 flex items-center gap-2">
                <Link
                  href="/sign-in"
                  style={{
                    color: "#24020E",
                    borderColor: "rgba(36, 2, 14, 0.25)",
                    backgroundColor: "rgba(255, 255, 255, 0.55)",
                  }}
                  className="rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-white/80"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
                  className="rounded-full px-4 py-2 text-sm font-semibold shadow-xs transition hover:opacity-90"
                >
                  Sign Up
                </Link>
              </div>
            ) : (
              <div ref={dropdownRef} className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="menu"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.65)",
                    color: "#24020E",
                    borderColor: "rgba(36, 2, 14, 0.2)",
                  }}
                  className="inline-flex items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 text-sm font-semibold shadow-2xs transition hover:bg-white/90"
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-[#24020E]/20"
                    />
                  ) : (
                    <span
                      style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    >
                      {initials}
                    </span>
                  )}
                  <span className="max-w-[130px] truncate">{user.name}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu */}
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      style={{
                        backgroundColor: "rgba(244, 226, 230, 0.96)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        borderColor: "rgba(36, 2, 14, 0.18)",
                        color: "#24020E",
                      }}
                      className="absolute right-0 mt-2 w-60 origin-top-right rounded-2xl border p-2 shadow-xl"
                    >
                      {/* User Header inside Dropdown */}
                      <div className="mb-1.5 flex items-center gap-3 rounded-xl bg-[#24020E]/5 px-3 py-2.5">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-[#24020E]/20"
                          />
                        ) : (
                          <span
                            style={{
                              backgroundColor: "#24020E",
                              color: "#F4E2E6",
                            }}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                          >
                            {initials}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#24020E]">
                            {user.name}
                          </p>
                          <p className="truncate text-[11px] font-medium text-[#24020E]/70 capitalize">
                            {user.role}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={getDashboardHref(user.role)}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] transition hover:bg-[#24020E]/10"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>

                      <Link
                        href="/profile-settings"
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] transition hover:bg-[#24020E]/10"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>

                      <div className="my-1.5 h-px bg-[#24020E]/12" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogoutClick}
                        disabled={loggingOut}
                        style={{ color: "#24020E" }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#24020E] hover:text-[#F4E2E6] disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
            style={{ color: "#24020E", borderColor: "rgba(36, 2, 14, 0.2)" }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/50 transition hover:bg-white/80 md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden md:hidden"
            >
              <div className="mt-3 flex flex-col gap-1.5 border-t border-[#24020E]/15 pt-3 pb-1">
                {navLinks.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={
                        active
                          ? { backgroundColor: "#24020E", color: "#F4E2E6" }
                          : { color: "#24020E" }
                      }
                      className="rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:bg-[#24020E]/10"
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {!user ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link
                      href="/sign-in"
                      style={{
                        color: "#24020E",
                        borderColor: "rgba(36, 2, 14, 0.25)",
                        backgroundColor: "rgba(255, 255, 255, 0.6)",
                      }}
                      className="rounded-2xl border py-2.5 text-center text-sm font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
                      className="rounded-2xl py-2.5 text-center text-sm font-semibold"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <div className="mt-2 rounded-2xl bg-white/55 p-3">
                    <div className="mb-2.5 flex items-center gap-2.5 border-b border-[#24020E]/10 pb-2.5">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="h-9 w-9 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          style={{
                            backgroundColor: "#24020E",
                            color: "#F4E2E6",
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                        >
                          {initials}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#24020E]">
                          {user.name}
                        </p>
                        <p className="text-xs text-[#24020E]/70 capitalize">
                          {user.role}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Link
                        href={getDashboardHref(user.role)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] hover:bg-[#24020E]/10"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                      <Link
                        href="/profile-settings"
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] hover:bg-[#24020E]/10"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        disabled={loggingOut}
                        style={{ backgroundColor: "#24020E", color: "#F4E2E6" }}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
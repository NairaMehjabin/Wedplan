"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type UserRole = "customer" | "vendor" | "admin";

export interface NavbarUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  isBlocked?: boolean;
}

interface NavbarProps {
  user?: NavbarUser | null;
  onLogout?: () => Promise<void> | void;
}

function getUserId(user?: NavbarUser | null): string {
  return String(user?.id || user?._id || "");
}

function getProfileHref(user?: NavbarUser | null): string {
  if (!user) return "/profile";
  const id = getUserId(user);
  switch (user.role) {
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

function readStoredUser(): NavbarUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as NavbarUser;
    if (!parsed?.email && !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

function NavbarInner({ user: propUser, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<NavbarUser | null>(
    propUser ?? null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const syncAuthUser = useCallback(async () => {
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
    const handleSync = () => {
      setCurrentUser(readStoredUser());
      void syncAuthUser();
    };

    handleSync();
    window.addEventListener("wedplan-auth-changed", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("wedplan-auth-changed", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [pathname, syncAuthUser]);

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

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setCurrentUser(null);
    setDropdownOpen(false);
    setMobileOpen(false);
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
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/sign-in"
      ) {
        window.location.replace("/sign-in");
      }
    }
  };

  const profileHref = getProfileHref(currentUser);

  const navLinks = currentUser
    ? [
        { label: "Home", href: "/" },
        { label: "Browse Services", href: "/services" },
        { label: "Dashboard", href: getDashboardHref(currentUser.role) },
        { label: "Profile", href: profileHref, matchPrefix: "/profile" },
      ]
    : [
        { label: "Home", href: "/" },
        { label: "Browse Services", href: "/services" },
      ];

  const isActive = (href: string, matchPrefix?: string) => {
    if (href === "/") return pathname === "/";
    if (matchPrefix) {
      return (
        pathname === matchPrefix || pathname?.startsWith(`${matchPrefix}/`)
      );
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const initials = (currentUser?.name || "W")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const renderAvatar = (sizeClass = "h-7 w-7 text-xs") => {
    if (currentUser?.image) {
      return (
        <img
          src={currentUser.image}
          alt={currentUser.name}
          className={`${sizeClass} rounded-full object-cover ring-1 ring-[#24020E]/20`}
        />
      );
    }
    return (
      <span
        style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
        className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full font-bold`}
      >
        {initials}
      </span>
    );
  };

  return (
    <header className="fixed top-3 right-0 left-0 z-40 mx-auto w-full max-w-6xl px-3 sm:px-6">
      <div
        style={{
          background:
            "linear-gradient(120deg, rgba(252, 249, 244, 0.9) 0%, rgba(255, 237, 241, 0.82) 52%, rgba(205, 232, 223, 0.68) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1.5px solid rgba(36, 2, 14, 0.16)",
          boxShadow:
            "0 10px 30px rgba(36, 2, 14, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.75)",
        }}
        className="relative rounded-[28px] px-4 py-2.5 sm:px-6"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[4px] rounded-[24px] border border-dashed border-[#24020E]/15"
        />

        <div className="relative z-10 flex items-center justify-between gap-3">
          {/* Left: Logo + Brand Text */}
          <Link
            href="/"
            style={{ color: "#24020E" }}
            className="group inline-flex shrink-0 items-center gap-2 focus:outline-none"
          >
            <span
              style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
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

          {/* Center: Round Button-Like Navigation Containers */}
          <nav
            aria-label="Primary Navigation"
            className="hidden flex-1 items-center justify-center gap-2 md:flex"
          >
            {navLinks.map((item) => {
              const active = isActive(item.href, item.matchPrefix);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  style={
                    active
                      ? {
                          backgroundColor: "#24020E",
                          color: "#FFEDF1",
                          borderColor: "#24020E",
                        }
                      : {
                          backgroundColor: "rgba(255, 255, 255, 0.68)",
                          color: "#24020E",
                          borderColor: "rgba(36, 2, 14, 0.2)",
                        }
                  }
                  className="inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold shadow-2xs transition hover:-translate-y-0.5 hover:bg-white/95"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth or Profile Pill + Small Logout Icon */}
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {!currentUser ? (
              <>
                <Link
                  href="/sign-in"
                  style={{
                    color: "#24020E",
                    borderColor: "rgba(36, 2, 14, 0.25)",
                    backgroundColor: "rgba(255, 255, 255, 0.68)",
                  }}
                  className="inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold shadow-2xs transition hover:bg-white/95"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
                  className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs transition hover:opacity-90"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div
                ref={dropdownRef}
                className="relative flex items-center gap-1.5"
              >
                <div
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.74)",
                    color: "#24020E",
                    borderColor: "rgba(36, 2, 14, 0.22)",
                  }}
                  className="inline-flex items-center gap-1 rounded-full border py-1 pr-1.5 pl-1.5 text-xs font-semibold shadow-2xs"
                >
                  <Link
                    href={profileHref}
                    title="Go to Profile"
                    className="inline-flex items-center gap-2 rounded-full pr-1 transition hover:opacity-85"
                  >
                    {renderAvatar("h-7 w-7 text-[11px]")}
                    <span className="max-w-[110px] truncate">
                      {currentUser.name}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setDropdownOpen((prev) => !prev)}
                    aria-label="Open Profile Menu"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="menu"
                    className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition hover:bg-[#24020E]/10"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleLogoutClick}
                  disabled={loggingOut}
                  title="Log out"
                  aria-label="Log out"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.74)",
                    color: "#24020E",
                    borderColor: "rgba(36, 2, 14, 0.22)",
                  }}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border shadow-2xs transition hover:bg-[#24020E] hover:text-[#FFEDF1] disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>

                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      style={{
                        backgroundColor: "rgba(252, 249, 244, 0.97)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        borderColor: "rgba(36, 2, 14, 0.18)",
                        color: "#24020E",
                      }}
                      className="absolute top-full right-0 mt-2 w-60 origin-top-right rounded-2xl border p-2 shadow-xl"
                    >
                      <Link
                        href={profileHref}
                        className="mb-1.5 flex items-center gap-3 rounded-xl bg-[#24020E]/5 px-3 py-2.5 transition hover:bg-[#24020E]/10"
                      >
                        {renderAvatar("h-9 w-9 text-xs")}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#24020E]">
                            {currentUser.name}
                          </p>
                          <p className="truncate text-[11px] font-medium text-[#24020E]/70 capitalize">
                            {currentUser.role}
                          </p>
                        </div>
                      </Link>

                      <Link
                        href={profileHref}
                        role="menuitem"
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] transition hover:bg-[#24020E]/10"
                      >
                        <UserCircle2 className="h-4 w-4" />
                        <span>View Profile</span>
                      </Link>

                      <Link
                        href={getDashboardHref(currentUser.role)}
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
                        <span>Account Settings</span>
                      </Link>

                      <div className="my-1.5 h-px bg-[#24020E]/12" />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogoutClick}
                        disabled={loggingOut}
                        style={{ color: "#24020E" }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition hover:bg-[#24020E] hover:text-[#FFEDF1] disabled:opacity-50"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
            style={{ color: "#24020E", borderColor: "rgba(36, 2, 14, 0.2)" }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-white/60 transition hover:bg-white/90 md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

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
                  const active = isActive(item.href, item.matchPrefix);
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      style={
                        active
                          ? { backgroundColor: "#24020E", color: "#FFEDF1" }
                          : {
                              backgroundColor: "rgba(255, 255, 255, 0.65)",
                              color: "#24020E",
                            }
                      }
                      className="rounded-full border border-[#24020E]/15 px-4 py-2 text-sm font-semibold transition"
                    >
                      {item.label}
                    </Link>
                  );
                })}

                {!currentUser ? (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link
                      href="/sign-in"
                      style={{
                        color: "#24020E",
                        borderColor: "rgba(36, 2, 14, 0.25)",
                        backgroundColor: "rgba(255, 255, 255, 0.65)",
                      }}
                      className="rounded-full border py-2 text-center text-sm font-semibold"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/sign-up"
                      style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
                      className="rounded-full py-2 text-center text-sm font-semibold"
                    >
                      Sign Up
                    </Link>
                  </div>
                ) : (
                  <div className="mt-2 rounded-2xl bg-white/65 p-3">
                    <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-[#24020E]/10 pb-2.5">
                      <Link
                        href={profileHref}
                        className="flex min-w-0 items-center gap-2.5"
                      >
                        {renderAvatar("h-9 w-9 text-xs")}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#24020E]">
                            {currentUser.name}
                          </p>
                          <p className="text-xs text-[#24020E]/70 capitalize">
                            {currentUser.role}
                          </p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={handleLogoutClick}
                        disabled={loggingOut}
                        title="Log out"
                        aria-label="Log out"
                        style={{ backgroundColor: "#24020E", color: "#FFEDF1" }}
                        className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:opacity-50"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Link
                        href={profileHref}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#24020E] hover:bg-[#24020E]/10"
                      >
                        <UserCircle2 className="h-4 w-4" />
                        <span>View Profile</span>
                      </Link>
                      <Link
                        href={getDashboardHref(currentUser.role)}
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
                        <span>Account Settings</span>
                      </Link>
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

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={null}>
      <NavbarInner {...props} />
    </Suspense>
  );
}
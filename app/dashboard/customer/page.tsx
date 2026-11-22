"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import ProtectedRouteGate from "../../components/ProtectedRouteGate";
import {
  LayoutDashboard,
  CalendarCheck,
  UserCircle2,
  LogOut,
  Menu,
  X,
  MapPin,
  Calendar,
  Clock,
  Eye,
  Ban,
  Trash2,
  AlertTriangle,
  Heart,
  Sparkles,
  Store,
  CheckCircle2,
  XCircle,
  Hourglass,
  Layers,
  Loader2,
  Home,
  Search,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const FALLBACK_IMAGE =
  "https://i.pinimg.com/736x/75/b6/2b/75b62baf81b9aacb79b6338d4df69043.jpg";

type CustomerTab = "overview" | "bookings";
type BookingStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled";

interface CustomerUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
}

export interface CustomerBooking {
  _id: string;
  serviceId: string;
  serviceName: string;
  serviceImage?: string;
  category?: string;
  price?: number;
  vendorId?: string;
  vendorName?: string;
  businessName?: string;
  eventDate: string;
  eventLocation: string;
  message?: string;
  status: BookingStatus;
  createdAt: string;
}

function readStoredUser(): CustomerUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    return JSON.parse(raw) as CustomerUser;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("wedplan_token");
}

function getCustomerProfileHref(user: CustomerUser | null): string {
  const id = String(user?.id || user?._id || "").trim();
  if (!id) return "/profile/customer";
  return `/profile/customer/${encodeURIComponent(id)}`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusPillStyle(status: BookingStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "Accepted":
      return {
        bg: "#E3F6F5",
        text: "#0F514C",
        border: "rgba(15, 81, 76, 0.25)",
      };
    case "Rejected":
    case "Cancelled":
      return {
        bg: "#FFF4F7",
        text: "#C84B31",
        border: "rgba(200, 75, 49, 0.3)",
      };
    case "Pending":
    default:
      return {
        bg: "#FEF9EC",
        text: "#854D0E",
        border: "rgba(133, 77, 14, 0.25)",
      };
  }
}

function CustomerDashboardContent() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<CustomerTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<CustomerUser | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"All" | BookingStatus>(
    "All"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Details modal, cancel loading state, and delete warning modal
  const [selectedBooking, setSelectedBooking] =
    useState<CustomerBooking | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingToDelete, setBookingToDelete] =
    useState<CustomerBooking | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const cached = readStoredUser();
    setUser(cached);

    const token = getToken();
    if (!token) return;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const fresh = data?.user || data?.data;
          if (fresh) {
            window.localStorage.setItem("wedplan_user", JSON.stringify(fresh));
            setUser(fresh);
          }
        }
      } catch {
        // Keep cached session if request fails transiently
      }
    })();
  }, [mounted]);

  const fetchBookings = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setBookings([]);
      setLoadingBookings(false);
      return;
    }

    try {
      setLoadingBookings(true);
      const res = await fetch(`${API_BASE}/api/bookings/my`, {
        cache: "no-store",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setBookings([]);
        return;
      }

      const data = await res.json().catch(() => null);
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.bookings)
          ? data.bookings
          : Array.isArray(data)
            ? data
            : [];
      setBookings(list);
    } catch {
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void fetchBookings();
  }, [mounted, fetchBookings]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter((b) => b.status === "Pending").length;
    const accepted = bookings.filter((b) => b.status === "Accepted").length;
    const rejected = bookings.filter((b) => b.status === "Rejected").length;
    return { total, pending, accepted, rejected };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return bookings.filter((b) => {
      const matchesStatus = statusFilter === "All" || b.status === statusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      const serviceMatch = String(b.serviceName || "")
        .toLowerCase()
        .includes(q);
      const vendorMatch = String(b.vendorName || "")
        .toLowerCase()
        .includes(q);
      const businessMatch = String(b.businessName || "")
        .toLowerCase()
        .includes(q);

      return serviceMatch || vendorMatch || businessMatch;
    });
  }, [bookings, statusFilter, searchQuery]);

  const handleCancelBooking = async (booking: CustomerBooking) => {
    if (booking.status !== "Pending") {
      toast.error(
        `Cannot cancel a booking that is already ${booking.status}. Only Pending requests can be cancelled.`
      );
      return;
    }

    try {
      setCancellingId(booking._id);
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/api/bookings/${encodeURIComponent(booking._id)}/cancel`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to cancel booking request");
      }

      setBookings((prev) =>
        prev.map((item) =>
          item._id === booking._id ? { ...item, status: "Cancelled" } : item
        )
      );
      if (selectedBooking?._id === booking._id) {
        setSelectedBooking({ ...booking, status: "Cancelled" });
      }
      toast.success("Booking request cancelled. You can now delete this card.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not cancel booking"
      );
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmDeleteBooking = async () => {
    if (!bookingToDelete) return;
    if (bookingToDelete.status !== "Cancelled") {
      toast.error("Only cancelled bookings can be deleted.");
      setBookingToDelete(null);
      return;
    }

    try {
      setDeletingId(bookingToDelete._id);
      const token = getToken();
      const res = await fetch(
        `${API_BASE}/api/bookings/${encodeURIComponent(bookingToDelete._id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to delete cancelled booking");
      }

      setBookings((prev) =>
        prev.filter((item) => item._id !== bookingToDelete._id)
      );
      if (selectedBooking?._id === bookingToDelete._id) {
        setSelectedBooking(null);
      }
      toast.success("Cancelled booking card deleted.");
      setBookingToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete booking"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      document.cookie = "wedplan_token=; path=/; max-age=0; SameSite=Lax";
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setUser(null);
    toast.success("Signed out.");
    router.push("/sign-in");
  };

  const tabItems: {
    id: CustomerTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "bookings",
      label: "My Bookings",
      icon: <CalendarCheck className="h-4 w-4" />,
      badge: stats.pending,
    },
  ];

  const displayName = user?.name || "Customer";
  const displayEmail = user?.email || "customer@wedplan.app";
  const profileHref = getCustomerProfileHref(user);

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip pt-20 pb-16 sm:pt-24"
    >
      {/* Background Grid & Soft Blush/Mint Accents */}
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
              "radial-gradient(circle, rgba(255, 224, 232, 0.6) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.55) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-10 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Mobile Drawer Bar */}
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/90 px-4 py-3 shadow-2xs backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-[#C84B31]" />
            <span className="text-xs font-bold tracking-wider uppercase">
              Customer Dashboard
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-1.5 text-xs font-semibold"
          >
            {sidebarOpen ? (
              <>
                <X className="h-4 w-4" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* SIDEBAR */}
          <aside
            className={`${
              sidebarOpen ? "block" : "hidden"
            } space-y-4 lg:sticky lg:top-24 lg:col-span-3 lg:block`}
          >
            <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 border-b border-[#24020E]/10 pb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-teal-950">
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#24020E]">
                    {displayName}
                  </p>
                  <p className="truncate text-[11px] text-[#24020E]/65">
                    {displayEmail}
                  </p>
                  <span className="mt-1 inline-block rounded-full border border-[#C84B31]/25 bg-white/80 px-2.5 py-0.5 text-[9px] font-bold tracking-wider text-[#C84B31] uppercase">
                    CUSTOMER ACCOUNT
                  </span>
                </div>
              </div>

              <nav
                aria-label="Customer Dashboard Navigation"
                className="mt-4 space-y-1.5"
              >
                {tabItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wider uppercase transition ${
                        active
                          ? "bg-[#24020E] text-[#FCF9F4] shadow-xs"
                          : "text-[#24020E]/80 hover:bg-[#E3F6F5]/75 hover:text-[#24020E]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-[#99F6E4] text-[#24020E]"
                              : "bg-[#E3F6F5] text-teal-950"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}

                <Link
                  href={profileHref}
                  onClick={() => setSidebarOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wider text-[#24020E]/80 uppercase transition hover:bg-[#E3F6F5]/75 hover:text-[#24020E]"
                >
                  <UserCircle2 className="h-4 w-4 text-teal-800" />
                  <span>Profile</span>
                </Link>
              </nav>

              <div className="mt-5 space-y-1.5 border-t border-[#24020E]/10 pt-4">
                <Link
                  href="/browse-services"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#24020E]/80 transition hover:bg-white/80"
                >
                  <Search className="h-3.5 w-3.5 text-teal-700" />
                  <span>Browse Services</span>
                </Link>
                <Link
                  href="/"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#24020E]/80 transition hover:bg-white/80"
                >
                  <Home className="h-3.5 w-3.5 text-teal-700" />
                  <span>Home</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#C84B31]/20 bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <section className="space-y-6 lg:col-span-9">
            {/* Dedicated Customer Dashboard Header */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#24020E]/15 bg-gradient-to-r from-white/85 via-[#FFF4F7]/80 to-[#E3F6F5]/65 p-6 shadow-sm backdrop-blur-md sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C84B31]/25 bg-[#FFF4F7] px-3 py-0.5 text-[10px] font-bold tracking-widest text-[#C84B31] uppercase">
                    <Heart className="h-3 w-3" />
                    <span>Customer Dashboard</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-teal-800/20 bg-[#E3F6F5] px-2.5 py-0.5 text-[10px] font-semibold text-teal-950">
                    <Sparkles className="h-3 w-3 text-teal-700" />
                    <span>{displayName}</span>
                  </span>
                </div>
                <h1
                  style={{ fontFamily: "var(--font-curly), cursive" }}
                  className="mt-2 text-3xl text-[#24020E] sm:text-4xl"
                >
                  {activeTab === "overview"
                    ? "Customer Dashboard Overview"
                    : "My Wedding Bookings"}
                </h1>
                <p className="mt-0.5 text-xs text-[#24020E]/70">
                  Track your booking requests, review vendor details, and manage
                  pending reservations.
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Link
                  href={profileHref}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-white/85 px-4 py-2.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase shadow-2xs transition hover:bg-[#E3F6F5]"
                >
                  <UserCircle2 className="h-3.5 w-3.5 text-teal-800" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/browse-services"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#24020E] px-4 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-xs transition hover:bg-teal-800"
                >
                  <Calendar className="h-3.5 w-3.5 text-[#99F6E4]" />
                  <span>Explore Services</span>
                </Link>
              </div>
            </div>

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Total Booking Requests
                      </span>
                      <Layers className="h-4 w-4 text-[#24020E]" />
                    </div>
                    <p className="mt-2.5 text-3xl font-bold text-[#24020E]">
                      {mounted ? stats.total : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Pending Bookings
                      </span>
                      <Hourglass className="h-4 w-4 text-amber-700" />
                    </div>
                    <p className="mt-2.5 text-3xl font-bold text-amber-800">
                      {mounted ? stats.pending : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]/80 p-5 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-teal-950/75 uppercase">
                        Accepted Bookings
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-teal-700" />
                    </div>
                    <p className="mt-2.5 text-3xl font-bold text-teal-900">
                      {mounted ? stats.accepted : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Rejected Bookings
                      </span>
                      <XCircle className="h-4 w-4 text-[#C84B31]" />
                    </div>
                    <p className="mt-2.5 text-3xl font-bold text-[#C84B31]">
                      {mounted ? stats.rejected : 0}
                    </p>
                  </div>
                </div>

                {/* Scrollable Recent Booking Requests Container */}
                <div className="rounded-2xl border border-[#24020E]/15 bg-white/75 p-6 shadow-sm backdrop-blur-md">
                  <div className="mb-4 flex items-center justify-between border-b border-[#24020E]/10 pb-3">
                    <h2 className="text-xs font-bold tracking-widest text-[#24020E] uppercase">
                      Recent Booking Requests
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("bookings")}
                      className="cursor-pointer text-xs font-semibold text-teal-800 hover:underline"
                    >
                      View All ({bookings.length}) →
                    </button>
                  </div>

                  {loadingBookings ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-xs text-[#24020E]/70">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                      <span>Loading your bookings...</span>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="font-[var(--font-cormorant)] text-xl text-[#24020E]/75">
                        No booking requests submitted yet.
                      </p>
                      <Link
                        href="/browse-services"
                        className="mt-3 inline-block rounded-xl bg-[#24020E] px-4 py-2 text-xs font-semibold text-[#FCF9F4]"
                      >
                        Browse Wedding Services
                      </Link>
                    </div>
                  ) : (
                    <div className="max-h-[320px] divide-y divide-[#24020E]/10 overflow-y-auto pr-1">
                      {bookings.map((bk) => {
                        const badge = statusPillStyle(bk.status);
                        return (
                          <div
                            key={bk._id}
                            className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#24020E]">
                                {bk.serviceName}
                              </p>
                              <p className="text-xs text-[#24020E]/65">
                                {bk.businessName || bk.vendorName || "Vendor"} •
                                Event: {formatDate(bk.eventDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  borderColor: badge.border,
                                }}
                                className="rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                              >
                                {bk.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedBooking(bk)}
                                className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-[#FFF4F7] px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[#E3F6F5]"
                              >
                                Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MY BOOKINGS TAB */}
            {activeTab === "bookings" && (
              <div className="space-y-4 rounded-2xl border border-[#24020E]/15 bg-white/65 p-5 shadow-sm backdrop-blur-md">
                {/* Search by Service or Vendor Name + Status Pills */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-[#24020E]/50" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by service or vendor name..."
                      aria-label="Search bookings by service or vendor name"
                      className="w-full rounded-xl border border-[#24020E]/15 bg-white/90 py-2 pr-8 pl-9 text-xs text-[#24020E] outline-none transition focus:border-teal-700"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer text-[#24020E]/50 hover:text-[#24020E]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        "All",
                        "Pending",
                        "Accepted",
                        "Rejected",
                        "Cancelled",
                      ] as const
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition ${
                          statusFilter === st
                            ? "bg-[#24020E] text-[#FCF9F4]"
                            : "border border-[#24020E]/15 bg-white/85 text-[#24020E]/75 hover:bg-[#E3F6F5]/70"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrollable Bookings Cards Container */}
                {loadingBookings ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#24020E]/15 bg-white/80 py-16 text-xs text-[#24020E]/70">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                    <span>Loading your booking requests...</span>
                  </div>
                ) : visibleBookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/80 p-12 text-center">
                    <p className="font-[var(--font-cormorant)] text-xl text-[#24020E]/80">
                      No matching booking requests found.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-3.5 overflow-y-auto pr-1">
                    {visibleBookings.map((bk) => {
                      const badge = statusPillStyle(bk.status);
                      const canCancel = bk.status === "Pending";
                      const canDelete = bk.status === "Cancelled";

                      return (
                        <div
                          key={bk._id}
                          className="flex flex-col gap-4 rounded-2xl border border-[#24020E]/15 bg-white/85 p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5"
                        >
                          <img
                            src={bk.serviceImage || FALLBACK_IMAGE}
                            alt={bk.serviceName}
                            className="h-24 w-full shrink-0 rounded-xl border border-[#24020E]/10 object-cover sm:h-24 sm:w-32"
                          />

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3
                                style={{
                                  fontFamily: "var(--font-curly), cursive",
                                }}
                                className="text-2xl text-[#24020E]"
                              >
                                {bk.serviceName}
                              </h3>
                              <span
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  borderColor: badge.border,
                                }}
                                className="rounded-full border px-3 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                              >
                                {bk.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#24020E]/75">
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <Store className="h-3.5 w-3.5 text-[#C84B31]" />
                                {bk.businessName || bk.vendorName || "Vendor"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-teal-700" />
                                Event:{" "}
                                <strong>{formatDate(bk.eventDate)}</strong>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-teal-700" />
                                {bk.eventLocation}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[#24020E]/60">
                                <Clock className="h-3.5 w-3.5" />
                                Requested: {formatDate(bk.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
                            <button
                              type="button"
                              onClick={() => setSelectedBooking(bk)}
                              className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7] px-3.5 py-2 text-[11px] font-semibold text-[#24020E] transition hover:bg-[#E3F6F5]"
                            >
                              <Eye className="h-3.5 w-3.5 text-teal-800" />
                              <span>View Details</span>
                            </button>

                            {canCancel && (
                              <button
                                type="button"
                                disabled={cancellingId === bk._id}
                                onClick={() => void handleCancelBooking(bk)}
                                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#C84B31]/30 bg-white px-3.5 py-2 text-[11px] font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white disabled:opacity-50"
                              >
                                {cancellingId === bk._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5" />
                                )}
                                <span>Cancel</span>
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                disabled={deletingId === bk._id}
                                onClick={() => setBookingToDelete(bk)}
                                aria-label={`Delete cancelled booking for ${bk.serviceName}`}
                                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#C84B31]/35 bg-[#FFF4F7] px-3.5 py-2 text-[11px] font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white disabled:opacity-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* BOOKING DETAILS MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBooking(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4]/95 p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#24020E]/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase">
                    Booking Details
                  </span>
                  <h2
                    style={{ fontFamily: "var(--font-curly), cursive" }}
                    className="text-2xl text-[#24020E]"
                  >
                    {selectedBooking.serviceName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#24020E]/15 bg-[#FFF4F7]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p>
                  <strong>Vendor:</strong>{" "}
                  {selectedBooking.businessName ||
                    selectedBooking.vendorName ||
                    "—"}
                </p>
                <p>
                  <strong>Event Date:</strong>{" "}
                  {formatDate(selectedBooking.eventDate)}
                </p>
                <p>
                  <strong>Event Location:</strong> {selectedBooking.eventLocation}
                </p>
                <p>
                  <strong>Requested On:</strong>{" "}
                  {formatDate(selectedBooking.createdAt)}
                </p>
                <p>
                  <strong>Status:</strong> {selectedBooking.status}
                </p>
                {typeof selectedBooking.price === "number" && (
                  <p>
                    <strong>Package Price:</strong> ৳
                    {selectedBooking.price.toLocaleString("en-BD")}
                  </p>
                )}
                {selectedBooking.message && (
                  <div className="rounded-xl border border-[#24020E]/10 bg-[#FFF4F7] p-3">
                    <strong className="block text-[10px] tracking-wider uppercase">
                      Your Message:
                    </strong>
                    <p className="mt-1 text-[#24020E]/80">
                      {selectedBooking.message}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {selectedBooking.status === "Pending" && (
                  <button
                    type="button"
                    disabled={cancellingId === selectedBooking._id}
                    onClick={() => void handleCancelBooking(selectedBooking)}
                    className="cursor-pointer rounded-xl border border-[#C84B31]/30 bg-white px-4 py-2 text-xs font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white"
                  >
                    Cancel Booking
                  </button>
                )}
                {selectedBooking.status === "Cancelled" && (
                  <button
                    type="button"
                    onClick={() => setBookingToDelete(selectedBooking)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#C84B31]/30 bg-[#FFF4F7] px-4 py-2 text-xs font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Card</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="cursor-pointer rounded-xl bg-[#24020E] px-4 py-2 text-xs font-semibold text-[#FCF9F4]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOM DELETE CONFIRMATION MODAL (No window.confirm) */}
      <AnimatePresence>
        {bookingToDelete && (
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-booking-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deletingId && setBookingToDelete(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/45 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-[#C84B31]/30 bg-[#FCF9F4] p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C84B31]/25 bg-[#FFF4F7] text-[#C84B31]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-[#C84B31] uppercase">
                    Confirm Removal
                  </span>
                  <h3
                    id="delete-booking-title"
                    className="mt-0.5 text-base font-bold text-[#24020E]"
                  >
                    Delete Cancelled Booking?
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#24020E]/75">
                    Are you sure you want to remove{" "}
                    <strong>{bookingToDelete.serviceName}</strong> from your
                    bookings list? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => setBookingToDelete(null)}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-4 py-2 text-xs font-semibold text-[#24020E] transition hover:bg-[#E3F6F5] disabled:opacity-50"
                >
                  Keep Card
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => void handleConfirmDeleteBooking()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C84B31] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 disabled:opacity-50"
                >
                  {deletingId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>{deletingId ? "Deleting..." : "Yes, Delete"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomerDashboardPage() {
  return (
    <ProtectedRouteGate allowedRoles={["customer"]}>
      <CustomerDashboardContent />
    </ProtectedRouteGate>
  );
}
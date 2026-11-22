"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import ProtectedRouteGate from "../components/ProtectedRouteGate";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  Receipt,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Eye,
  X,
  RefreshCw,
  LogOut,
  UserCheck,
  Ban,
  Lock,
  Menu,
  ArrowUpDown,
  RotateCcw,
  ExternalLink,
  MapPin,
  Tag,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const SERVICE_CATEGORIES = [
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
] as const;

type AdminSection = "overview" | "users" | "services" | "transactions";

interface AdminUserRecord {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: "customer" | "vendor" | "admin" | string;
  image?: string | null;
  isBlocked?: boolean;
  businessName?: string;
  subscriptionPlan?: string;
  createdAt?: string;
}

interface AdminServiceRecord {
  _id: string;
  vendorId?: string;
  vendorName?: string;
  businessName?: string;
  serviceName: string;
  category?: string;
  description?: string;
  price?: number;
  location?: string;
  images?: string[];
  img?: string;
  status?: "pending" | "approved" | "rejected" | string;
  isActive?: boolean;
  createdAt?: string;
}

interface AdminTransactionRecord {
  _id?: string;
  vendorId?: string;
  vendorName?: string;
  vendorEmail?: string;
  businessName?: string;
  plan?: string;
  amount?: number;
  currency?: string;
  status?: string;
  stripeSessionId?: string;
  createdAt?: string;
}

function getRecordId(item?: { id?: string; _id?: string } | null): string {
  return String(item?.id || item?._id || "");
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("wedplan_token");
}

function readStoredUser(): AdminUserRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    return JSON.parse(raw) as AdminUserRecord;
  } catch {
    return null;
  }
}

function extractArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      for (const key of keys) {
        if (Array.isArray(nested[key])) return nested[key] as unknown[];
      }
    }
  }
  return [];
}

function buildAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    seed || "WedPlan"
  )}`;
}

function formatCurrency(amount = 0, currency = "BDT"): string {
  const symbol = String(currency).toUpperCase() === "USD" ? "$" : "৳";
  return `${symbol}${Number(amount || 0).toLocaleString("en-BD")}`;
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

function statusBadgeStyle(status: string): string {
  switch (status) {
    case "approved":
      return "border-teal-800/25 bg-[#E3F6F5] text-teal-900";
    case "rejected":
      return "border-[#24020E]/20 bg-white/75 text-[#24020E]/70";
    default:
      return "border-[#C84B31]/30 bg-[#FFEDF1] text-[#C84B31]";
  }
}

function AdminDashboardContent() {
  const router = useRouter();

  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<AdminSection>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [servicesList, setServicesList] = useState<AdminServiceRecord[]>([]);
  const [transactionsList, setTransactionsList] = useState<
    AdminTransactionRecord[]
  >([]);

  const [loadingData, setLoadingData] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserRecord | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [serviceSearch, setServiceSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("");
  const [serviceStatusFilter, setServiceStatusFilter] = useState("all");
  const [priceSort, setPriceSort] = useState<"default" | "asc" | "desc">(
    "default"
  );

  const currentRole = String(user?.role || "").toLowerCase();
  const isBlockedUser = Boolean(user?.isBlocked);
  const isAdmin = currentRole === "admin" && !isBlockedUser;

  const handleLogout = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setUser(null);
    await fetch(`${API_BASE}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);
    router.replace("/sign-in");
  }, [router]);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const cached = readStoredUser();
      if (cached && active) {
        setUser(cached);
      }

      const token = getToken();
      if (!token) {
        if (active) {
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (res.status === 401 || res.status === 403) {
          const errData = await res.json().catch(() => null);
          if (active) {
            if (
              cached?.isBlocked ||
              errData?.message?.toLowerCase().includes("blocked")
            ) {
              setUser({ ...(cached || {}), isBlocked: true });
            } else {
              window.localStorage.removeItem("wedplan_token");
              window.localStorage.removeItem("wedplan_user");
              setUser(null);
            }
            setAuthLoading(false);
          }
          return;
        }

        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (active && data?.user) {
            window.localStorage.setItem(
              "wedplan_user",
              JSON.stringify(data.user)
            );
            setUser(data.user);
          }
        }
      } catch {
        // Keep cached session on transient error
      } finally {
        if (active) setAuthLoading(false);
      }
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const fetchAdminData = useCallback(async (showToast = false) => {
    setLoadingData(true);
    const token = getToken();
    const authHeaders: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    let anyFailed = false;

    try {
      const res = await fetch(`${API_BASE}/api/services/admin/all`, {
        cache: "no-store",
        headers: authHeaders,
        credentials: "include",
      });
      if (res.ok) {
        const sJson = await res.json().catch(() => null);
        const rawServices = extractArray(sJson, [
          "services",
          "data",
          "items",
          "results",
        ]) as AdminServiceRecord[];
        setServicesList(rawServices);
      } else {
        anyFailed = true;
      }
    } catch {
      anyFailed = true;
    }

    try {
      const uRes = await fetch(`${API_BASE}/api/admin/users`, {
        cache: "no-store",
        headers: authHeaders,
        credentials: "include",
      });
      if (uRes.ok) {
        const uJson = await uRes.json().catch(() => null);
        const rawUsers = extractArray(uJson, [
          "users",
          "data",
          "items",
        ]) as AdminUserRecord[];
        setUsersList(rawUsers);
      }
    } catch {
      // Ignore if users endpoint fails
    }

    try {
      const tRes = await fetch(`${API_BASE}/api/admin/transactions`, {
        cache: "no-store",
        headers: authHeaders,
        credentials: "include",
      });
      if (tRes.ok) {
        const tJson = await tRes.json().catch(() => null);
        const rawTx = extractArray(tJson, [
          "transactions",
          "data",
          "items",
        ]) as AdminTransactionRecord[];
        setTransactionsList(rawTx);
      }
    } catch {
      // Ignore if transactions endpoint fails
    }

    setLoadingData(false);

    if (showToast) {
      if (anyFailed) {
        toast.error("Could not refresh services from /api/services/admin/all.");
      } else {
        toast.success("Records synced.");
      }
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/sign-in");
      return;
    }

    if (isAdmin) {
      void fetchAdminData(false);
    } else {
      setLoadingData(false);
    }
  }, [authLoading, user, isAdmin, router, fetchAdminData]);

  const stats = useMemo(() => {
    const totalUsers = usersList.length;
    const totalVendors = usersList.filter(
      (u) => String(u.role || "").toLowerCase() === "vendor"
    ).length;
    const totalCustomers = usersList.filter(
      (u) => String(u.role || "").toLowerCase() === "customer"
    ).length;
    const totalServices = servicesList.length;
    const pendingServices = servicesList.filter(
      (s) => String(s.status || "pending").toLowerCase() === "pending"
    ).length;
    const totalTransactions = transactionsList.length;

    return {
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    };
  }, [usersList, servicesList, transactionsList]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return usersList.filter((u) => {
      const roleMatch =
        roleFilter === "all" ||
        String(u.role || "").toLowerCase() === roleFilter.toLowerCase();
      const queryMatch =
        !q ||
        String(u.name || "")
          .toLowerCase()
          .includes(q) ||
        String(u.email || "")
          .toLowerCase()
          .includes(q);
      return roleMatch && queryMatch;
    });
  }, [usersList, userSearch, roleFilter]);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();

    const matches = servicesList.filter((s) => {
      const statusVal = String(s.status || "pending").toLowerCase();
      const statusMatch =
        serviceStatusFilter === "all" || statusVal === serviceStatusFilter;

      const catMatch =
        categoryFilter === "all" ||
        String(s.category || "").toLowerCase() === categoryFilter.toLowerCase();

      const locMatch =
        !loc ||
        String(s.location || "")
          .toLowerCase()
          .includes(loc);

      const queryMatch =
        !q ||
        String(s.serviceName || "")
          .toLowerCase()
          .includes(q) ||
        String(s.category || "")
          .toLowerCase()
          .includes(q) ||
        String(s.location || "")
          .toLowerCase()
          .includes(q) ||
        String(s.vendorName || "")
          .toLowerCase()
          .includes(q) ||
        String(s.businessName || "")
          .toLowerCase()
          .includes(q);

      return statusMatch && catMatch && locMatch && queryMatch;
    });

    if (priceSort === "asc") {
      return [...matches].sort(
        (a, b) => Number(a.price || 0) - Number(b.price || 0)
      );
    }
    if (priceSort === "desc") {
      return [...matches].sort(
        (a, b) => Number(b.price || 0) - Number(a.price || 0)
      );
    }
    return matches;
  }, [
    servicesList,
    serviceSearch,
    categoryFilter,
    locationFilter,
    serviceStatusFilter,
    priceSort,
  ]);

  const hasServiceFilters =
    Boolean(serviceSearch.trim()) ||
    categoryFilter !== "all" ||
    Boolean(locationFilter.trim()) ||
    serviceStatusFilter !== "all" ||
    priceSort !== "default";

  const resetServiceFilters = () => {
    setServiceSearch("");
    setCategoryFilter("all");
    setLocationFilter("");
    setServiceStatusFilter("all");
    setPriceSort("default");
  };

  const handleToggleBlockUser = async (targetUser: AdminUserRecord) => {
    const targetId = getRecordId(targetUser);
    if (!targetId || actionBusyId) return;

    const nextBlocked = !Boolean(targetUser.isBlocked);
    const token = getToken();
    setActionBusyId(targetId);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/users/${encodeURIComponent(targetId)}/block`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ isBlocked: nextBlocked }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || "Failed to update user block status."
        );
      }

      setUsersList((prev) =>
        prev.map((u) =>
          getRecordId(u) === targetId ? { ...u, isBlocked: nextBlocked } : u
        )
      );
      if (selectedUser && getRecordId(selectedUser) === targetId) {
        setSelectedUser((prev) =>
          prev ? { ...prev, isBlocked: nextBlocked } : null
        );
      }

      toast.success(
        nextBlocked
          ? `${targetUser.name || "User"} has been blocked.`
          : `${targetUser.name || "User"} has been unblocked.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update user block status."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleUpdateServiceStatus = async (
    service: AdminServiceRecord,
    nextStatus: "approved" | "rejected" | "pending"
  ) => {
    if (!service._id || actionBusyId) return;
    const token = getToken();
    setActionBusyId(service._id);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/services/${encodeURIComponent(service._id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Could not update service status.");
      }

      setServicesList((prev) =>
        prev.map((item) =>
          item._id === service._id ? { ...item, status: nextStatus } : item
        )
      );

      toast.success(
        `"${service.serviceName}" marked as ${nextStatus.toUpperCase()}.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update service status."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteService = async (service: AdminServiceRecord) => {
    if (!service._id || actionBusyId) return;
    if (
      !window.confirm(
        `Permanently remove "${service.serviceName}" from WedPlan?`
      )
    ) {
      return;
    }

    const token = getToken();
    setActionBusyId(service._id);

    try {
      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(service._id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to delete service.");
      }

      setServicesList((prev) => prev.filter((item) => item._id !== service._id));
      toast.success(`Removed "${service.serviceName}".`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete service."
      );
    } finally {
      setActionBusyId(null);
    }
  };

  if (authLoading) {
    return (
      <main
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-4"
      >
        <p className="text-xs font-semibold tracking-[0.2em] text-[#24020E]/65 uppercase">
          Loading admin dashboard...
        </p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  if (isBlockedUser) {
    return (
      <main
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-4 pt-24 pb-16"
      >
        <div className="max-w-md rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-7 text-center shadow-sm backdrop-blur-md">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#24020E]/15 bg-[#E3F6F5] text-[#C84B31]">
            <Ban className="h-5 w-5" />
          </div>
          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="text-3xl"
          >
            Account Suspended
          </h1>
          <p className="mt-2 text-xs text-[#24020E]/75">
            Your WedPlan account has been blocked. Protected dashboard features
            are unavailable.
          </p>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#24020E] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase transition hover:bg-[#C84B31]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    const targetDashboard =
      currentRole === "vendor" ? "/dashboard/vendor" : "/dashboard/customer";
    return (
      <main
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-4 pt-24 pb-16"
      >
        <div className="max-w-md rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-7 text-center shadow-sm backdrop-blur-md">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#24020E]/15 bg-[#E3F6F5] text-[#C84B31]">
            <Lock className="h-5 w-5" />
          </div>
          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="text-3xl"
          >
            Admin Access Only
          </h1>
          <p className="mt-2 text-xs text-[#24020E]/75">
            Your account role ({currentRole || "member"}) does not have permission
            to view the Admin Dashboard.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push(targetDashboard)}
              className="cursor-pointer rounded-xl bg-[#24020E] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase transition hover:bg-[#C84B31]"
            >
              Go to My Dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="cursor-pointer rounded-xl border border-[#24020E]/20 bg-white/80 px-5 py-2.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]/60"
            >
              Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  const navItems: {
    id: AdminSection;
    label: string;
    count?: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "users",
      label: "Manage Users",
      count: String(stats.totalUsers),
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "services",
      label: "Manage Services",
      count: String(stats.totalServices),
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      id: "transactions",
      label: "Transactions",
      count: String(stats.totalTransactions),
      icon: <Receipt className="h-4 w-4" />,
    },
  ];

  const overviewCards = [
    {
      label: "Total Registered Users",
      value: stats.totalUsers,
      accent: "#24020E",
      cardBg: "bg-[#FFF4F7]/85 border-[#24020E]/15",
    },
    {
      label: "Total Vendors",
      value: stats.totalVendors,
      accent: "#C84B31",
      cardBg: "bg-[#FFF4F7]/85 border-[#24020E]/15",
    },
    {
      label: "Total Customers",
      value: stats.totalCustomers,
      accent: "#0F766E",
      cardBg: "bg-[#E3F6F5]/75 border-teal-900/20",
    },
    {
      label: "Total Services",
      value: stats.totalServices,
      accent: "#24020E",
      cardBg: "bg-[#FFF4F7]/85 border-[#24020E]/15",
    },
    {
      label: "Pending Services",
      value: stats.pendingServices,
      accent: "#C84B31",
      cardBg: "bg-[#FFF4F7]/85 border-[#24020E]/15",
    },
    {
      label: "Total Transactions",
      value: stats.totalTransactions,
      accent: "#0F766E",
      cardBg: "bg-[#E3F6F5]/75 border-teal-900/20",
    },
  ];

  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip px-4 pt-24 pb-16 sm:px-6 sm:pt-28 lg:px-8"
    >
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
              "radial-gradient(circle, rgba(255, 224, 232, 0.55) 0%, transparent 72%)",
          }}
          className="absolute -top-20 -left-20 h-[380px] w-[380px] rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.5) 0%, transparent 72%)",
          }}
          className="absolute right-[-80px] bottom-4 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col justify-between gap-4 border-b border-[#24020E]/10 pb-6 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-label="Toggle navigation"
                className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#24020E]/20 bg-[#FFF4F7]/80 p-2 text-[#24020E] backdrop-blur-md lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5]/85 px-3 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-teal-900 uppercase backdrop-blur-xs">
                <ShieldCheck className="h-3 w-3 text-teal-700" />
                <span>Admin Control</span>
              </span>
            </div>
            <h1
              style={{ fontFamily: "var(--font-curly), cursive" }}
              className="text-3xl text-[#24020E] sm:text-4xl"
            >
              Admin Dashboard
            </h1>
            <p className="font-[var(--font-cormorant)] text-base italic text-[#24020E]/70">
              Manage users, review wedding services, and oversee platform
              activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchAdminData(true)}
            disabled={loadingData}
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#24020E]/20 bg-[#FFF4F7]/85 px-4 py-2.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase shadow-sm backdrop-blur-md transition hover:border-teal-800/35 hover:bg-[#E3F6F5]/75 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-teal-700 ${
                loadingData ? "animate-spin" : ""
              }`}
            />
            <span>Refresh</span>
          </button>
        </header>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
          <aside
            className={`${
              mobileNavOpen ? "block" : "hidden"
            } space-y-4 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-4 shadow-sm backdrop-blur-md lg:sticky lg:top-24 lg:col-span-3 lg:block`}
          >
            <div className="flex items-center gap-3 rounded-xl border border-[#24020E]/10 bg-white/75 p-3">
              <img
                src={user.image || buildAvatar(user.name || "Admin")}
                alt={user.name || "Admin"}
                className="h-10 w-10 shrink-0 rounded-xl border border-[#24020E]/20 bg-[#E3F6F5] object-cover"
                onError={(e) => {
                  e.currentTarget.src = buildAvatar(user.name || "Admin");
                }}
              />
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[#24020E]">
                  {user.name || "Administrator"}
                </p>
                <p className="truncate text-[11px] text-[#24020E]/65">
                  {user.email}
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-semibold tracking-wide transition ${
                      active
                        ? "bg-[#24020E] text-[#FCF9F4] shadow-sm"
                        : "text-[#24020E]/80 hover:bg-white/70 hover:text-[#24020E]"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={active ? "text-[#99F6E4]" : "text-[#C84B31]"}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          active
                            ? "bg-white/15 text-[#E3F6F5]"
                            : "bg-[#E3F6F5] text-teal-900"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="space-y-2 border-t border-[#24020E]/10 pt-3">
              <button
                type="button"
                onClick={() => router.push("/profile")}
                className="w-full cursor-pointer rounded-xl border border-[#24020E]/15 bg-white/75 px-3.5 py-2 text-[11px] font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]/70"
              >
                Profile Settings
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#C84B31]/25 bg-white/60 px-3.5 py-2 text-[11px] font-semibold tracking-wider text-[#C84B31] uppercase transition hover:bg-[#C84B31] hover:text-white"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          <section className="rounded-2xl border border-[#24020E]/15 bg-white/65 p-5 shadow-sm backdrop-blur-md sm:p-7 lg:col-span-9">
            {loadingData ? (
              <div className="flex items-center justify-center gap-2.5 py-20 text-xs font-semibold tracking-widest text-[#24020E]/65 uppercase">
                <RefreshCw className="h-4 w-4 animate-spin text-teal-700" />
                <span>Loading records...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    <div>
                      <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                        Overview
                      </span>
                      <h2 className="mt-0.5 text-xl font-bold text-[#24020E]">
                        Platform Summary
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {overviewCards.map((card) => (
                        <div
                          key={card.label}
                          className={`rounded-2xl border p-5 shadow-sm backdrop-blur-md transition hover:shadow-md ${card.cardBg}`}
                        >
                          <p className="text-[10px] font-bold tracking-[0.18em] text-[#24020E]/65 uppercase">
                            {card.label}
                          </p>
                          <p
                            style={{ color: card.accent }}
                            className="mt-2.5 text-3xl font-bold"
                          >
                            {card.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "users" && (
                  <motion.div
                    key="users"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-col justify-between gap-3 border-b border-[#24020E]/10 pb-4 sm:flex-row sm:items-center">
                      <div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                          Directory
                        </span>
                        <h2 className="text-xl font-bold text-[#24020E]">
                          Manage Users ({filteredUsers.length})
                        </h2>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative">
                          <Search
                            className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#24020E]/45"
                            size={15}
                          />
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            placeholder="Search name or email..."
                            className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 py-2 pr-3.5 pl-9 text-xs text-[#24020E] placeholder-[#24020E]/45 outline-none transition focus:border-teal-700 focus:bg-white sm:w-52"
                          />
                        </div>

                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2 text-xs font-semibold text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                        >
                          <option value="all">All Roles</option>
                          <option value="customer">Customer</option>
                          <option value="vendor">Vendor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/60 p-12 text-center text-xs text-[#24020E]/70">
                        No users found.
                      </div>
                    ) : (
                      <div className="max-h-[540px] space-y-3 overflow-y-auto pr-1.5">
                        {filteredUsers.map((u) => {
                          const uid = getRecordId(u);
                          const isSelf = uid === getRecordId(user);
                          const blocked = Boolean(u.isBlocked);
                          return (
                            <div
                              key={uid || u.email}
                              className="flex flex-col justify-between gap-3 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-sm backdrop-blur-md transition hover:shadow-md sm:flex-row sm:items-center"
                            >
                              <div className="flex items-center gap-3.5">
                                <img
                                  src={u.image || buildAvatar(u.name || "User")}
                                  alt={u.name || "User"}
                                  className="h-11 w-11 shrink-0 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5] object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = buildAvatar(
                                      u.name || "User"
                                    );
                                  }}
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-[#24020E]">
                                      {u.name || "Unnamed User"}
                                    </p>
                                    <span className="rounded-full border border-[#24020E]/15 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase">
                                      {u.role || "customer"}
                                    </span>
                                    {blocked ? (
                                      <span className="rounded-full border border-[#C84B31]/30 bg-red-50 px-2.5 py-0.5 text-[10px] font-semibold text-[#C84B31] uppercase">
                                        Blocked
                                      </span>
                                    ) : (
                                      <span className="rounded-full border border-teal-800/25 bg-[#E3F6F5] px-2.5 py-0.5 text-[10px] font-semibold text-teal-900 uppercase">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <p className="truncate text-xs text-[#24020E]/65">
                                    {u.email || "—"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(u)}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-white/80 px-3 py-2 text-[11px] font-semibold text-[#24020E] transition hover:bg-[#E3F6F5]/75"
                                >
                                  <Eye className="h-3.5 w-3.5 text-teal-800" />
                                  <span>Details</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isSelf || actionBusyId === uid}
                                  onClick={() => void handleToggleBlockUser(u)}
                                  className={`inline-flex cursor-pointer items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                                    blocked
                                      ? "bg-[#24020E] text-[#FCF9F4] hover:bg-teal-800"
                                      : "border border-[#C84B31]/30 bg-[#C84B31]/10 text-[#C84B31] hover:bg-[#C84B31] hover:text-white"
                                  }`}
                                >
                                  {blocked ? (
                                    <>
                                      <UserCheck className="h-3.5 w-3.5" />
                                      <span>Unblock</span>
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="h-3.5 w-3.5" />
                                      <span>Block</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "services" && (
                  <motion.div
                    key="services"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#24020E]/10 pb-4">
                      <div>
                        <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                          Moderation
                        </span>
                        <h2 className="text-xl font-bold text-[#24020E]">
                          Manage Services ({filteredServices.length})
                        </h2>
                      </div>

                      {hasServiceFilters && (
                        <button
                          type="button"
                          onClick={resetServiceFilters}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5]/80 px-3 py-1.5 text-[11px] font-semibold text-teal-900 transition hover:bg-[#E3F6F5]"
                        >
                          <RotateCcw className="h-3 w-3 text-[#C84B31]" />
                          <span>Reset Filters</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/75 p-3.5 backdrop-blur-md sm:grid-cols-2 lg:grid-cols-5">
                      <div className="relative lg:col-span-2">
                        <Search
                          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[#24020E]/45"
                          size={15}
                        />
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Search service or vendor..."
                          className="w-full rounded-xl border border-[#24020E]/15 bg-white/85 py-2 pr-3.5 pl-9 text-xs text-[#24020E] placeholder-[#24020E]/45 outline-none transition focus:border-teal-700 focus:bg-white"
                        />
                      </div>

                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-2 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                      >
                        <option value="all">All Categories</option>
                        {SERVICE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={locationFilter}
                        onChange={(e) => setLocationFilter(e.target.value)}
                        placeholder="Filter location..."
                        className="w-full rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-2 text-xs text-[#24020E] placeholder-[#24020E]/45 outline-none transition focus:border-teal-700 focus:bg-white"
                      />

                      <div className="flex gap-2">
                        <select
                          value={serviceStatusFilter}
                          onChange={(e) =>
                            setServiceStatusFilter(e.target.value)
                          }
                          className="w-full cursor-pointer rounded-xl border border-[#24020E]/15 bg-white/85 px-2.5 py-2 text-xs font-semibold text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                        >
                          <option value="all">All Status</option>
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        <button
                          type="button"
                          onClick={() =>
                            setPriceSort((prev) =>
                              prev === "default"
                                ? "asc"
                                : prev === "asc"
                                  ? "desc"
                                  : "default"
                            )
                          }
                          title="Sort by price"
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5]/80 px-2.5 py-2 text-[11px] font-semibold text-teal-900 transition hover:bg-[#E3F6F5]"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5 text-[#C84B31]" />
                          <span>
                            {priceSort === "asc"
                              ? "Low"
                              : priceSort === "desc"
                                ? "High"
                                : "Price"}
                          </span>
                        </button>
                      </div>
                    </div>

                    {filteredServices.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/60 p-12 text-center text-xs text-[#24020E]/70">
                        No services found matching your filter.
                      </div>
                    ) : (
                      <div className="max-h-[540px] overflow-y-auto pr-1.5">
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          {filteredServices.map((srv) => {
                            const statusLower = String(
                              srv.status || "pending"
                            ).toLowerCase();
                            const previewImg =
                              srv.images?.[0] ||
                              srv.img ||
                              buildAvatar(srv.serviceName);
                            const isBusy = actionBusyId === srv._id;

                            return (
                              <div
                                key={srv._id}
                                className="flex flex-col justify-between rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-sm backdrop-blur-md transition hover:shadow-md"
                              >
                                <div className="flex gap-3.5">
                                  <img
                                    src={previewImg}
                                    alt={srv.serviceName}
                                    className="h-20 w-20 shrink-0 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5] object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = buildAvatar(
                                        srv.serviceName
                                      );
                                    }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeStyle(
                                          statusLower
                                        )}`}
                                      >
                                        {statusLower}
                                      </span>
                                      {srv.category && (
                                        <span className="inline-flex items-center gap-1 truncate text-[11px] text-[#24020E]/65">
                                          <Tag className="h-3 w-3 text-teal-700" />
                                          {srv.category}
                                        </span>
                                      )}
                                    </div>

                                    <h3 className="mt-1 truncate text-base font-bold text-[#24020E]">
                                      {srv.serviceName}
                                    </h3>

                                    <p className="text-xs font-bold text-[#C84B31]">
                                      {formatCurrency(srv.price || 0)}
                                    </p>

                                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#24020E]/65">
                                      <MapPin className="h-3 w-3 shrink-0 text-teal-700" />
                                      <span>
                                        {srv.location || "Location TBA"}
                                        {srv.businessName || srv.vendorName
                                          ? ` • ${srv.businessName || srv.vendorName}`
                                          : ""}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#24020E]/10 pt-3">
                                  <Link
                                    href={`/services/${encodeURIComponent(srv._id)}`}
                                    className="inline-flex items-center gap-1 rounded-xl border border-teal-800/25 bg-[#E3F6F5]/85 px-2.5 py-1.5 text-[11px] font-semibold text-teal-950 transition hover:bg-teal-800 hover:text-white"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Details</span>
                                  </Link>

                                  {statusLower !== "approved" && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void handleUpdateServiceStatus(
                                          srv,
                                          "approved"
                                        )
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-teal-700 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-teal-800 disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      <span>Approve</span>
                                    </button>
                                  )}

                                  {statusLower !== "pending" && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void handleUpdateServiceStatus(
                                          srv,
                                          "pending"
                                        )
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-amber-700/30 bg-[#FEF9EC] px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      <Clock className="h-3.5 w-3.5 text-amber-700" />
                                      <span>Pending</span>
                                    </button>
                                  )}

                                  {statusLower !== "rejected" && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        void handleUpdateServiceStatus(
                                          srv,
                                          "rejected"
                                        )
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-white/80 px-2.5 py-1.5 text-[11px] font-semibold text-[#24020E] transition hover:bg-[#FFEDF1] disabled:opacity-50"
                                    >
                                      <XCircle className="h-3.5 w-3.5 text-[#C84B31]" />
                                      <span>Reject</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleDeleteService(srv)}
                                    className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#C84B31]/25 bg-red-50/80 px-2.5 py-1.5 text-[11px] font-semibold text-[#C84B31] transition hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "transactions" && (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-5"
                  >
                    <div className="border-b border-[#24020E]/10 pb-4">
                      <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                        Ledger
                      </span>
                      <h2 className="text-xl font-bold text-[#24020E]">
                        Transactions ({transactionsList.length})
                      </h2>
                    </div>

                    {transactionsList.length === 0 ? (
                      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/65 p-12 text-center text-xs text-[#24020E]/70 backdrop-blur-md">
                        No transactions yet.
                      </div>
                    ) : (
                      <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1.5">
                        {transactionsList.map((tx, idx) => (
                          <div
                            key={tx._id || tx.stripeSessionId || idx}
                            className="flex flex-col justify-between gap-2 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 text-xs shadow-sm sm:flex-row sm:items-center"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-[#24020E]">
                                {tx.businessName || tx.vendorName || "Vendor"}{" "}
                                <span className="font-normal text-[#24020E]/65">
                                  ({tx.vendorEmail || tx.vendorId || "—"})
                                </span>
                              </p>
                              <p className="text-[11px] text-[#24020E]/70">
                                Plan:{" "}
                                <strong className="uppercase">
                                  {tx.plan || "premium"}
                                </strong>{" "}
                                • Date: {formatDate(tx.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-[#24020E]">
                                {formatCurrency(tx.amount || 0, tx.currency)}
                              </span>
                              <span className="rounded-full border border-teal-800/25 bg-[#E3F6F5] px-2.5 py-0.5 text-[10px] font-bold uppercase text-teal-900">
                                {tx.status || "paid"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/35 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-md rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4]/95 p-6 shadow-xl backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="absolute top-5 right-5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#24020E]/15 bg-[#E3F6F5]/80 text-[#24020E] transition hover:bg-[#24020E] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>

              <span className="text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                User Details
              </span>

              <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-[#24020E]/10 bg-[#FFF4F7]/80 p-3.5">
                <img
                  src={
                    selectedUser.image ||
                    buildAvatar(selectedUser.name || "User")
                  }
                  alt={selectedUser.name || "User"}
                  className="h-12 w-12 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5] object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-[#24020E]">
                    {selectedUser.name || "Unnamed User"}
                  </p>
                  <p className="truncate text-xs text-[#24020E]/65">
                    {selectedUser.email || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#24020E]/10 bg-white/80 p-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-[#24020E]/55 uppercase">
                    Role
                  </span>
                  <span className="mt-0.5 inline-block font-semibold uppercase">
                    {selectedUser.role || "customer"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-[#24020E]/55 uppercase">
                    Status
                  </span>
                  <span className="mt-0.5 inline-block font-semibold uppercase">
                    {selectedUser.isBlocked ? "Blocked" : "Active"}
                  </span>
                </div>
                {selectedUser.businessName && (
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold tracking-wider text-[#24020E]/55 uppercase">
                      Business Name
                    </span>
                    <span className="mt-0.5 inline-block font-semibold">
                      {selectedUser.businessName}
                    </span>
                  </div>
                )}
                {selectedUser.subscriptionPlan && (
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold tracking-wider text-[#24020E]/55 uppercase">
                      Subscription Plan
                    </span>
                    <span className="mt-0.5 inline-block font-semibold uppercase">
                      {selectedUser.subscriptionPlan}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRouteGate allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </ProtectedRouteGate>
  );
}
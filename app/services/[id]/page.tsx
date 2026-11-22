"use client";

import React, { Suspense, useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Sparkles,
  Store,
  Heart,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
  ArrowUpRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SessionUser {
  _id?: string;
  id?: string;
  userId?: string;
  sub?: string;
  name?: string;
  email?: string;
  role?: string;
}

interface VendorProfileRecord {
  _id?: string;
  id?: string;
  name?: string;
  businessName?: string;
  role?: string;
  image?: string | null;
  photoUrl?: string;
  profilePicture?: string;
  avatar?: string;
  img?: string;
}

export interface ServiceDetail {
  _id: string;
  vendorId?: string | { _id?: string; id?: string };
  vendorName?: string;
  businessName?: string;
  vendorImage?: string | null;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images?: string[];
  status?: string;
  isActive?: boolean;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

const FALLBACK_IMAGE =
  "https://i.pinimg.com/736x/75/b6/2b/75b62baf81b9aacb79b6338d4df69043.jpg";

function resolveEntityId(
  value?: string | { _id?: string; id?: string } | null
): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value._id || value.id || "").trim();
}

function resolveUserId(user?: SessionUser | null): string {
  if (!user) return "";
  return String(user._id || user.id || user.userId || user.sub || "").trim();
}

function decodeJwtPayload(token: string | null): SessionUser | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 && parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const decoded = atob(padded);
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

function getCachedUser(token: string | null): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const rawUser = window.localStorage.getItem("wedplan_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as SessionUser;
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    // Ignore malformed localStorage payload
  }
  return decodeJwtPayload(token);
}

function buildDicebearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    seed || "WedPlan Atelier"
  )}`;
}

function extractVendorImage(record?: VendorProfileRecord | null): string {
  return (
    record?.image ||
    record?.profilePicture ||
    record?.photoUrl ||
    record?.avatar ||
    record?.img ||
    ""
  );
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const directKeys = ["wedplan_token", "token", "auth_token", "accessToken"];
  for (const key of directKeys) {
    const val = window.localStorage.getItem(key);
    if (val && val.trim()) {
      const cleaned = val.replace(/^Bearer\s+/i, "").trim();
      if (cleaned) {
        if (key !== "wedplan_token") {
          window.localStorage.setItem("wedplan_token", cleaned);
        }
        return cleaned;
      }
    }
  }

  try {
    const rawUser = window.localStorage.getItem("wedplan_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as {
        token?: string;
        accessToken?: string;
      };
      const embedded = parsed?.token || parsed?.accessToken;
      if (embedded && embedded.trim()) {
        const cleaned = embedded.replace(/^Bearer\s+/i, "").trim();
        window.localStorage.setItem("wedplan_token", cleaned);
        return cleaned;
      }
    }
  } catch {
    // Ignore malformed localStorage payload
  }

  return null;
}

async function fetchSessionUser(
  token: string | null
): Promise<SessionUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      cache: "no-store",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const user = (data?.user || data?.data || null) as SessionUser | null;
    if (user && typeof window !== "undefined") {
      window.localStorage.setItem("wedplan_user", JSON.stringify(user));
    }
    return user;
  } catch {
    return null;
  }
}

async function hasActiveSession(token: string | null): Promise<boolean> {
  const user = await fetchSessionUser(token);
  return Boolean(user || resolveUserId(user));
}

function validateEventDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return "Please select an event date.";
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return "Please enter a valid event date.";
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "That calendar date does not exist. Please pick a valid date.";
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  if (parsed.getTime() < todayUtc) {
    return "Event date cannot be in the past. Please choose today or a future date.";
  }

  return null;
}

function ServiceDetailLoadingScreen() {
  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="flex min-h-screen flex-col items-center justify-center px-6 pt-28"
    >
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-700" />
      <p className="text-xs font-semibold tracking-[0.22em] text-[#24020E]/65 uppercase">
        Opening service details...
      </p>
    </div>
  );
}

function ProtectedServiceRoute({
  children,
  fallbackPath,
}: {
  children: React.ReactNode;
  fallbackPath: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let active = true;

    async function verifyAccess() {
      const token = getAuthToken();
      const cached = getCachedUser(token);

      if (cached && active) {
        setAuthorized(true);
      }

      const sessionUser = await fetchSessionUser(token);
      if (!active) return;

      if (sessionUser) {
        setAuthorized(true);
        setCheckingAuth(false);
        return;
      }

      if (!cached) {
        setAuthorized(false);
        setCheckingAuth(false);
        const redirectTarget = pathname || fallbackPath;
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`
        );
      } else {
        setCheckingAuth(false);
      }
    }

    void verifyAccess();
    return () => {
      active = false;
    };
  }, [mounted, pathname, fallbackPath, router]);

  if (!mounted || checkingAuth || !authorized) {
    return <ServiceDetailLoadingScreen />;
  }

  return <>{children}</>;
}

function ServiceDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfileRecord | null>(
    null
  );
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !id) return;
    let active = true;

    async function loadService() {
      try {
        setLoading(true);
        setError(null);
        setActiveImageIndex(0);
        setVendorProfile(null);

        const token = getAuthToken();
        const cachedUser = getCachedUser(token);
        if (cachedUser && active) {
          setCurrentUser(cachedUser);
        }

        const [res, sessionUser] = await Promise.all([
          fetch(`${API_BASE}/api/services/${id}`, {
            cache: "no-store",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          fetchSessionUser(token),
        ]);

        if (active && sessionUser) {
          setCurrentUser(sessionUser);
        }

        const data = await res.json();

        if (!res.ok || !data?.success || !data?.data) {
          throw new Error(
            data?.message || `Unable to load service (Status: ${res.status})`
          );
        }

        if (active) {
          const loadedService: ServiceDetail = data.data;
          setService(loadedService);

          const vendorIdStr = resolveEntityId(loadedService.vendorId);
          if (vendorIdStr) {
            try {
              const vRes = await fetch(
                `${API_BASE}/api/auth/user/${encodeURIComponent(vendorIdStr)}`,
                {
                  cache: "no-store",
                  credentials: "include",
                  headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : undefined,
                }
              );
              if (vRes.ok) {
                const vJson = await vRes.json().catch(() => null);
                const fetchedUser = vJson?.user || vJson?.data || vJson;
                if (
                  active &&
                  fetchedUser &&
                  typeof fetchedUser === "object"
                ) {
                  setVendorProfile(fetchedUser as VendorProfileRecord);
                }
              }
            } catch {
              // Fall back to service fields / self-made profile
            }
          }
        }
      } catch (err) {
        if (active) {
          const msg =
            err instanceof Error ? err.message : "Could not load this service.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadService();
    return () => {
      active = false;
    };
  }, [mounted, id]);

  useEffect(() => {
    if (!isBookingModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBookingModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBookingModalOpen]);

  const isOwnVendorService = async (
    targetService: ServiceDetail
  ): Promise<boolean> => {
    const token = getAuthToken();
    const activeUser =
      (await fetchSessionUser(token)) || currentUser || getCachedUser(token);
    if (activeUser) {
      setCurrentUser(activeUser);
    }

    const role = String(activeUser?.role || "").toLowerCase();
    const activeUserId = resolveUserId(activeUser);
    const serviceVendorId = resolveEntityId(targetService.vendorId);

    if (role === "vendor" && activeUserId && serviceVendorId) {
      return activeUserId === serviceVendorId;
    }

    // Fallback when backend omits vendorId on a service owned by this vendor
    if (role === "vendor" && !serviceVendorId) {
      const ownerLabel = String(
        targetService.vendorName || targetService.businessName || ""
      )
        .trim()
        .toLowerCase();
      const userName = String(activeUser?.name || "").trim().toLowerCase();
      if (ownerLabel && userName && ownerLabel === userName) {
        return true;
      }
    }

    return false;
  };

  const openBookingModal = async () => {
    if (!service) return;

    if (await isOwnVendorService(service)) {
      toast.error("Vendors cannot book their own services.");
      return;
    }

    setBookingFeedback(null);
    setIsBookingModalOpen(true);
  };

  const closeBookingModal = () => {
    if (submitting) return;
    setIsBookingModalOpen(false);
  };

  const reportBookingError = (msg: string) => {
    setBookingFeedback({ type: "error", text: msg });
    toast.error(msg);
  };

  const handleBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBookingFeedback(null);

    if (!service) {
      reportBookingError(
        "Service details are missing. Please refresh and try again."
      );
      return;
    }

    if (await isOwnVendorService(service)) {
      setIsBookingModalOpen(false);
      toast.error("Vendors cannot book their own services.");
      return;
    }

    if (!eventDate.trim() && !eventLocation.trim()) {
      reportBookingError("Please fill in both Event Date and Event Location.");
      return;
    }

    if (!eventDate.trim()) {
      reportBookingError("Event Date is required.");
      return;
    }

    if (!eventLocation.trim()) {
      reportBookingError("Event Location is required.");
      return;
    }

    const dateError = validateEventDate(eventDate);
    if (dateError) {
      reportBookingError(dateError);
      return;
    }

    try {
      setSubmitting(true);
      const token = getAuthToken();
      const vendorIdStr = resolveEntityId(service.vendorId);

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceId: service._id,
          ...(vendorIdStr ? { vendorId: vendorIdStr } : {}),
          eventDate: eventDate.trim(),
          eventLocation: eventLocation.trim(),
          message: message.trim(),
          status: "Pending",
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        const stillAuthenticated = await hasActiveSession(token);
        if (stillAuthenticated) {
          reportBookingError(
            data?.message ||
              "Could not submit booking request. Please verify your account role and try again."
          );
          return;
        }

        const authMsg = "Please sign in to submit a booking request.";
        toast.error(authMsg);
        router.replace(
          `/sign-in?redirect=${encodeURIComponent(pathname || `/services/${id}`)}`
        );
        return;
      }

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            `Could not submit booking request (Status: ${res.status}).`
        );
      }

      const successMsg = "Booking request sent! Status: Pending.";
      setBookingFeedback({ type: "success", text: successMsg });
      toast.success(successMsg);
      setEventDate("");
      setEventLocation("");
      setMessage("");
      setIsBookingModalOpen(false);
      router.push("/dashboard/customer");
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Something went wrong while booking.";
      reportBookingError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || loading) {
    return <ServiceDetailLoadingScreen />;
  }

  if (error || !service) {
    return (
      <div
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen flex-col items-center justify-center px-6 pt-32 text-center"
      >
        <div className="max-w-md rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-8 shadow-sm backdrop-blur-md">
          <h2
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="mb-2 text-3xl text-[#24020E]"
          >
            Service not found
          </h2>
          <p className="mb-6 font-[var(--font-cormorant)] text-lg text-[#24020E]/75">
            {error || "This wedding service could not be found."}
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-[#24020E] px-6 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages =
    Array.isArray(service.images) && service.images.length > 0
      ? service.images
      : [FALLBACK_IMAGE];

  const mainImage = galleryImages[activeImageIndex] || FALLBACK_IMAGE;

  const vendorIdStr = resolveEntityId(service.vendorId);
  const isLinkedVendor = Boolean(vendorIdStr);
  const ownerName =
    vendorProfile?.name ||
    service.vendorName ||
    service.businessName ||
    "WedPlan Curated Studio";
  const ownerBusiness =
    vendorProfile?.businessName ||
    service.businessName ||
    `${service.category} Specialist`;
  const ownerSeed = vendorIdStr || ownerName;
  const ownerAvatar =
    extractVendorImage(vendorProfile) ||
    service.vendorImage ||
    buildDicebearAvatar(ownerSeed);
  const vendorProfileHref = vendorIdStr
    ? `/profile/vendor/${encodeURIComponent(vendorIdStr)}`
    : `/profile/vendor/default-${encodeURIComponent(service._id)}`;

  const isBookable =
    (service.status || "approved").toLowerCase() === "approved" &&
    service.isActive !== false;

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative flex min-h-screen flex-col overflow-x-clip pt-24 pb-20 sm:pt-28"
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

      {/* Top Action Bar */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-2">
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-xs font-semibold tracking-wider uppercase transition hover:opacity-85"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#24020E]/20 bg-[#FFF4F7]/85 shadow-2xs backdrop-blur-md transition group-hover:bg-[#24020E] group-hover:text-[#FCF9F4]">
            <ArrowLeft size={16} />
          </div>
          <span className="rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-1.5 shadow-2xs backdrop-blur-md">
            Back Home
          </span>
        </Link>

        <span className="rounded-full border border-teal-800/25 bg-[#E3F6F5]/85 px-4 py-1 text-[11px] font-semibold tracking-wider text-teal-950 uppercase backdrop-blur-xs">
          {service.category}
        </span>
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-grow px-6 py-8 md:py-12">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
          {/* Left Visual Card */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-sm backdrop-blur-md sm:p-5">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#24020E]/10 bg-white/70">
                <motion.img
                  key={mainImage}
                  initial={{ opacity: 0.75, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={mainImage}
                  alt={service.serviceName}
                  className="h-full w-full object-cover"
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-xl border transition ${
                        idx === activeImageIndex
                          ? "border-teal-700 ring-2 ring-teal-700/20"
                          : "border-[#24020E]/15 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={imgUrl || FALLBACK_IMAGE}
                        alt={`View ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-[#24020E]/10 pt-3.5">
                <span className="text-[11px] font-bold tracking-wider text-[#24020E]/60 uppercase">
                  Starting Package
                </span>
                <span className="font-[var(--font-cormorant)] text-2xl font-bold text-[#C84B31]">
                  ৳{Number(service.price || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Info Side */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5 md:space-y-6"
          >
            <div>
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5]/85 px-3.5 py-1 text-[10px] font-bold tracking-wider text-teal-950 uppercase">
                <Sparkles size={11} className="text-teal-700" />
                <span>{service.category}</span>
              </div>

              <h1
                style={{ fontFamily: "var(--font-curly), cursive" }}
                className="text-4xl leading-tight text-[#24020E] md:text-5xl"
              >
                {service.serviceName}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-[#24020E]/80">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#24020E]/12 bg-white/80 px-3 py-1.5 backdrop-blur-xs">
                  <MapPin className="h-3.5 w-3.5 text-teal-700" />
                  {service.location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#24020E]/12 bg-[#FFF4F7]/85 px-3 py-1.5 backdrop-blur-xs">
                  <Store className="h-3.5 w-3.5 text-[#C84B31]" />
                  {ownerBusiness}
                </span>
              </div>
            </div>

            <p className="font-[var(--font-cormorant)] text-lg leading-relaxed text-[#24020E]/85 md:text-xl">
              {service.description}
            </p>

            {/* Clickable Service Owner / Vendor Profile Card */}
            <Link
              href={vendorProfileHref}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]/65 p-4 shadow-2xs backdrop-blur-md transition hover:border-teal-800/35 hover:bg-[#E3F6F5]/90 hover:shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <img
                  src={ownerAvatar}
                  alt={ownerName}
                  onError={(e) => {
                    e.currentTarget.src = buildDicebearAvatar(ownerSeed);
                  }}
                  className="h-12 w-12 shrink-0 rounded-xl border border-[#24020E]/15 bg-white object-cover"
                />
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold tracking-[0.18em] text-teal-800 uppercase">
                    {isLinkedVendor ? "Service Owner" : "Default Studio Profile"}
                  </span>
                  <p className="truncate text-sm font-bold text-[#24020E] group-hover:text-teal-950">
                    {ownerName}
                  </p>
                  <p className="truncate text-xs text-[#24020E]/65">
                    {ownerBusiness}
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-2 text-[11px] font-semibold text-[#24020E] transition group-hover:bg-[#24020E] group-hover:text-[#FCF9F4]">
                <span>Vendor Profile</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            {/* Booking Actions */}
            {!isBookable ? (
              <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 text-xs font-semibold text-[#24020E]">
                This service is currently unavailable for booking.
              </div>
            ) : (
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] py-3.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 active:scale-[0.99]"
                >
                  <Calendar size={16} />
                  <span>Request Booking</span>
                </button>

                <button
                  type="button"
                  aria-label="Open booking modal"
                  onClick={openBookingModal}
                  className="flex w-12 cursor-pointer items-center justify-center rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 shadow-2xs backdrop-blur-md transition hover:bg-[#E3F6F5]/75"
                >
                  <Heart size={18} className="text-[#C84B31]" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Booking Request Modal */}
      <AnimatePresence>
        {isBookable && isBookingModalOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeBookingModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/40 p-4 backdrop-blur-xs"
          >
            <motion.form
              noValidate
              onSubmit={handleBookingSubmit}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4]/95 p-6 shadow-xl backdrop-blur-md sm:p-7"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#24020E]/10 pb-3.5">
                <div>
                  <span className="inline-block rounded-full border border-teal-800/20 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-wider text-teal-900 uppercase">
                    Pending Request
                  </span>
                  <h2
                    id="booking-modal-title"
                    style={{ fontFamily: "var(--font-curly), cursive" }}
                    className="mt-1 text-2xl text-[#24020E] sm:text-3xl"
                  >
                    Book {service.serviceName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeBookingModal}
                  aria-label="Close booking modal"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#24020E]/15 bg-[#FFF4F7] text-[#24020E] transition hover:bg-[#24020E] hover:text-[#FCF9F4]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label
                  htmlFor="eventDate"
                  className="mb-1 block text-[10px] font-bold tracking-wider uppercase"
                >
                  Event Date *
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="eventLocation"
                  className="mb-1 block text-[10px] font-bold tracking-wider uppercase"
                >
                  Event Location *
                </label>
                <input
                  id="eventLocation"
                  type="text"
                  placeholder="Venue or city..."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-[10px] font-bold tracking-wider uppercase"
                >
                  Additional Message
                </label>
                <textarea
                  id="message"
                  rows={3}
                  placeholder="Tell the vendor about your ceremony, date details, or preferences..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>

              {bookingFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-xl border p-3.5 text-xs font-semibold sm:text-sm ${
                    bookingFeedback.type === "success"
                      ? "border-teal-800/25 bg-[#E3F6F5] text-teal-950"
                      : "border-[#C84B31]/30 bg-[#FFF4F7] text-[#C84B31]"
                  }`}
                >
                  {bookingFeedback.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C84B31]" />
                  )}
                  <span>{bookingFeedback.text}</span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeBookingModal}
                  disabled={submitting}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white/80 px-5 py-3 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 text-[#99F6E4]" />
                      <span>Confirm Booking Request</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ServiceDetailPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<ServiceDetailLoadingScreen />}>
      <ProtectedRouteGate fallbackPath={`/services/${id}`}>
        <ServiceDetailContent params={params} />
      </ProtectedRouteGate>
    </Suspense>
  );
}
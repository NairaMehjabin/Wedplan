"use client";

import React, { Suspense, useState, useEffect, use } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface ServiceDetail {
  _id: string;
  vendorId?: string;
  vendorName?: string;
  businessName?: string;
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

function hasAuthSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem("wedplan_token");
  const user = window.localStorage.getItem("wedplan_user");
  return Boolean(token || user);
}

function validateEventDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) {
    return "Please select an event date.";
  }

  // Match YYYY-MM-DD strictly so partial/malformed dates are caught
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

function ServiceDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    hasAuthSession()
  );

  const [service, setService] = useState<ServiceDetail | null>(null);
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

  // Enforce authentication & redirect signed-out visitors to /sign-in
  useEffect(() => {
    const checkAuth = () => {
      const authed = hasAuthSession();
      setIsAuthenticated(authed);

      if (!authed) {
        const query = searchParams?.toString();
        const targetPath = `${pathname || `/services/${id}`}${query ? `?${query}` : ""}`;
        const redirectParam =
          targetPath && targetPath.startsWith("/")
            ? `?redirect=${encodeURIComponent(targetPath)}`
            : "";
        router.replace(`/sign-in${redirectParam}`);
      }
    };

    checkAuth();
    window.addEventListener("wedplan-auth-changed", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("wedplan-auth-changed", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, [id, pathname, searchParams, router]);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    let active = true;

    async function loadService() {
      try {
        setLoading(true);
        setError(null);
        setActiveImageIndex(0);

        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("wedplan_token")
            : null;

        const res = await fetch(`${API_BASE}/api/services/${id}`, {
          cache: "no-store",
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const data = await res.json();

        if (!res.ok || !data?.success || !data?.data) {
          throw new Error(
            data?.message || `Unable to load service (Status: ${res.status})`
          );
        }

        if (active) {
          setService(data.data);
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
  }, [id, isAuthenticated]);

  // Close modal on Escape key
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

  const openBookingModal = () => {
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

    if (!hasAuthSession()) {
      const authMsg = "Please sign in to submit a booking request.";
      toast.error(authMsg);
      router.replace(
        `/sign-in?redirect=${encodeURIComponent(pathname || `/services/${id}`)}`
      );
      return;
    }

    if (!service) {
      reportBookingError("Service details are missing. Please refresh and try again.");
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
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("wedplan_token")
          : null;

      const res = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceId: service._id,
          vendorId: service.vendorId,
          eventDate: eventDate.trim(),
          eventLocation: eventLocation.trim(),
          message: message.trim(),
          status: "Pending",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message || `Could not submit booking request (Status: ${res.status}).`
        );
      }

      const successMsg = "Booking request sent! Status: Pending.";
      setBookingFeedback({ type: "success", text: successMsg });
      toast.success(successMsg);
      setEventDate("");
      setEventLocation("");
      setMessage("");
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

  if (!isAuthenticated) {
    return (
      <div
        style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
        className="flex min-h-screen flex-col items-center justify-center px-6 pt-28"
      >
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#C84B31]" />
        <p className="text-[11px] font-black tracking-[0.28em] uppercase">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
        className="flex min-h-screen flex-col items-center justify-center px-6 pt-28"
      >
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#C84B31]" />
        <p className="text-[11px] font-black tracking-[0.28em] uppercase">
          Opening keepsake details...
        </p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div
        style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
        className="flex min-h-screen flex-col items-center justify-center px-6 pt-32 text-center"
      >
        <div className="max-w-md rounded-[36px] border-[3px] border-[#24020E] bg-[#FCF9F4] p-8 shadow-[8px_8px_0px_0px_#24020E]">
          <h2
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="mb-3 text-3xl text-[#24020E]"
          >
            Service not found
          </h2>
          <p className="mb-6 font-[var(--font-cormorant)] text-lg text-[#24020E]/80">
            {error || "This wedding service could not be found."}
          </p>
          <Link
            href="/"
            className="inline-block rounded-full border-2 border-[#24020E] bg-[#24020E] px-6 py-3 text-xs font-black tracking-widest text-[#FCF9F4] uppercase shadow-md transition hover:scale-105"
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
  const vendorDisplay =
    service.businessName || service.vendorName || "Verified Atelier";
  const isBookable =
    (service.status || "approved").toLowerCase() === "approved" &&
    service.isActive !== false;

  return (
    <div
      style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
      className="relative flex min-h-screen flex-col overflow-x-clip pt-24 pb-20 sm:pt-28"
    >
      {/* Off-White & Darker Pink Circle Auras */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(252, 249, 244, 0.85) 0%, rgba(252, 249, 244, 0.25) 58%, transparent 76%)",
          }}
          className="absolute -top-20 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(232, 155, 174, 0.32) 0%, rgba(217, 122, 148, 0.12) 58%, transparent 76%)",
          }}
          className="absolute top-1/3 -right-24 h-[420px] w-[420px] rounded-full blur-3xl"
        />
      </div>

      {/* Top Action Bar */}
      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-2">
        <Link
          href="/"
          className="group flex items-center gap-3 text-[10px] font-black tracking-widest uppercase transition-all hover:opacity-85"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#24020E] bg-[#FCF9F4] shadow-[3px_3px_0px_0px_#24020E] transition-colors group-hover:bg-[#24020E] group-hover:text-[#FCF9F4]">
            <ArrowLeft size={17} />
          </div>
          <span className="rounded-full border border-[#24020E]/25 bg-[#FCF9F4]/90 px-3.5 py-1.5 shadow-2xs">
            Back Home
          </span>
        </Link>

        <span className="rounded-full border-2 border-[#24020E] bg-[#FCF9F4] px-4 py-1.5 text-[10px] font-black tracking-widest uppercase shadow-[3px_3px_0px_0px_#24020E]">
          {service.category}
        </span>
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-grow px-6 py-8 md:py-12">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Left Visual Keepsake Frame */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="relative"
          >
            <div className="relative flex flex-col justify-between overflow-hidden rounded-[44px] border-[3px] border-[#24020E] bg-[#FCF9F4]/90 p-5 shadow-[10px_10px_0px_0px_#24020E] sm:p-7">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-[8px] rounded-[36px] border border-dashed border-[#24020E]/25"
              />

              <div className="relative z-10 aspect-[4/3] w-full overflow-hidden rounded-[30px] border-2 border-[#24020E]/20 bg-[#24020E]/5">
                <motion.img
                  key={mainImage}
                  initial={{ opacity: 0.7, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  src={mainImage}
                  alt={service.serviceName}
                  className="h-full w-full object-cover"
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="relative z-10 mt-4 flex items-center gap-2.5 overflow-x-auto pb-1">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`h-14 w-18 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                        idx === activeImageIndex
                          ? "border-[#C84B31] shadow-[2px_2px_0px_0px_#24020E]"
                          : "border-[#24020E]/20 opacity-65 hover:opacity-100"
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
            </div>

            {/* Tilted Price Stamp Badge */}
            <div className="z-20 -mt-5 ml-auto mr-2 flex h-22 w-22 rotate-6 flex-col items-center justify-center rounded-full border-[3px] border-[#24020E] bg-[#C84B31] text-[#FCF9F4] shadow-[5px_5px_0px_0px_#24020E] sm:absolute sm:-right-5 sm:-bottom-5 sm:mt-0 sm:mr-0 sm:h-24 sm:w-24">
              <span className="text-[9px] font-black tracking-widest uppercase opacity-90">
                From
              </span>
              <span className="font-[var(--font-cormorant)] text-lg font-black leading-tight sm:text-xl">
                ৳{Number(service.price || 0).toLocaleString()}
              </span>
            </div>
          </motion.div>

          {/* Right Editorial Info Side */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6 md:space-y-7"
          >
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-[#24020E] bg-[#C84B31] px-4 py-1.5 text-[10px] font-black tracking-widest text-[#FCF9F4] uppercase shadow-[3px_3px_0px_0px_#24020E]">
                <Sparkles size={12} /> {service.category}
              </div>

              <h1
                style={{ fontFamily: "var(--font-curly), cursive" }}
                className="mb-3 text-4xl leading-tight text-[#24020E] md:text-6xl"
              >
                {service.serviceName}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#24020E]/80">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#24020E]/20 bg-[#FCF9F4]/85 px-3.5 py-1">
                  <MapPin className="h-4 w-4 text-[#C84B31]" />
                  {service.location}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#24020E]/20 bg-[#FCF9F4]/85 px-3.5 py-1">
                  <Store className="h-4 w-4 text-[#442D1C]" />
                  {vendorDisplay}
                </span>
              </div>

              <div className="mt-4 h-[3px] w-24 rounded-full bg-[#24020E]/20" />
            </div>

            <p className="font-[var(--font-cormorant)] text-lg leading-relaxed font-medium text-[#24020E]/85 md:text-2xl">
              {service.description}
            </p>

            {/* Keepsake Vendor & Note Box */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-[#24020E]/30 bg-[#FCF9F4]/85 p-5 md:p-6">
              <div className="pointer-events-none absolute -top-4 -right-4 rotate-12 opacity-10">
                <Store size={64} />
              </div>
              <p className="mb-1 text-[10px] font-black tracking-[0.2em] text-[#C84B31] uppercase">
                Vendor Keepsake Note:
              </p>
              <p className="font-[var(--font-cormorant)] text-lg italic text-[#24020E]/90">
                &ldquo;Curated by {vendorDisplay} in {service.location} —
                crafted to make your celebration feel timeless.&rdquo;
              </p>
            </div>

            {/* Tactile Action Buttons */}
            {!isBookable ? (
              <div className="rounded-2xl border-2 border-[#24020E]/30 bg-[#FCF9F4] p-4 text-sm font-semibold text-[#24020E]">
                This service is currently unavailable for booking.
              </div>
            ) : (
              <div className="flex gap-4 pt-1">
                <button
                  type="button"
                  onClick={openBookingModal}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-[25px] border-2 border-[#24020E] bg-[#24020E] py-4 text-[#FCF9F4] shadow-[5px_5px_0px_0px_#C84B31] transition-all hover:scale-[1.02] active:scale-95 md:py-5"
                >
                  <Calendar size={20} strokeWidth={2.5} />
                  <span className="text-xs font-black tracking-[0.2em] uppercase">
                    Request Booking
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="Open booking modal"
                  onClick={openBookingModal}
                  className="flex w-14 cursor-pointer items-center justify-center rounded-[25px] border-[3px] border-[#24020E] bg-[#FCF9F4] shadow-[4px_4px_0px_0px_#24020E] transition-colors hover:bg-[#FFEDF1] md:w-16"
                >
                  <Heart size={20} className="text-[#C84B31]" />
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/55 p-4 backdrop-blur-xs"
          >
            <motion.form
              noValidate
              onSubmit={handleBookingSubmit}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[34px] border-[3px] border-[#24020E] bg-[#FCF9F4] p-6 shadow-[10px_10px_0px_0px_#24020E] sm:p-7"
            >
              <div className="flex items-start justify-between gap-3 border-b border-dashed border-[#24020E]/20 pb-3.5">
                <div>
                  <span className="inline-block rounded-full bg-[#FFEDF1] px-3 py-0.5 text-[10px] font-black tracking-wider text-[#24020E] uppercase">
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
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-[#24020E] bg-white text-[#24020E] transition hover:bg-[#24020E] hover:text-[#FCF9F4]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label
                  htmlFor="eventDate"
                  className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                >
                  Event Date *
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white px-4 py-2.5 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="eventLocation"
                  className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                >
                  Event Location *
                </label>
                <input
                  id="eventLocation"
                  type="text"
                  placeholder="Venue or city..."
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white px-4 py-2.5 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                >
                  Additional Message
                </label>
                <textarea
                  id="message"
                  rows={3}
                  placeholder="Tell the vendor about your ceremony, date details, or preferences..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white px-4 py-2.5 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                />
              </div>

              {bookingFeedback && (
                <div
                  className={`flex items-start gap-2 rounded-2xl border-2 p-3.5 text-xs font-semibold sm:text-sm ${
                    bookingFeedback.type === "success"
                      ? "border-emerald-700/40 bg-emerald-50 text-emerald-950"
                      : "border-[#C84B31] bg-[#FFEDF1] text-[#24020E]"
                  }`}
                >
                  {bookingFeedback.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
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
                  className="cursor-pointer rounded-full border-2 border-[#24020E] bg-white px-5 py-3.5 text-xs font-black tracking-widest text-[#24020E] uppercase transition hover:bg-[#FFEDF1] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#24020E] bg-[#C84B31] py-3.5 text-xs font-black tracking-widest text-[#FCF9F4] uppercase shadow-[4px_4px_0px_0px_#24020E] transition hover:opacity-95 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
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
  return (
    <Suspense
      fallback={
        <div
          style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
          className="flex min-h-screen flex-col items-center justify-center px-6 pt-28"
        >
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#C84B31]" />
          <p className="text-[11px] font-black tracking-[0.28em] uppercase">
            Loading keepsake...
          </p>
        </div>
      }
    >
      <ServiceDetailContent params={params} />
    </Suspense>
  );
}
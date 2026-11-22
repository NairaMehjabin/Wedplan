"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { XCircle, Crown, Loader2, Home } from "lucide-react";

interface SessionUser {
  role?: string;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("wedplan_token");
}

function readStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export default function PaymentCancelPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/sign-in");
      return;
    }
    setUser(readStoredUser());
    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) {
    return (
      <div
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-4 pt-20"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#24020E]/75">
          <Loader2 className="h-4 w-4 animate-spin text-teal-800" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const dashboardHref =
    user?.role === "customer"
      ? "/dashboard/customer"
      : user?.role === "admin"
        ? "/dashboard/admin"
        : "/dashboard/vendor";

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip px-4 pt-24 pb-16 sm:px-6 lg:px-8"
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
              "radial-gradient(circle, rgba(254, 243, 199, 0.65) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.5) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-10 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-[#24020E]/15 bg-white/85 p-6 shadow-sm backdrop-blur-md sm:p-8"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C84B31]/30 bg-[#FFF4F7] px-3 py-1 text-[10px] font-bold tracking-widest text-[#C84B31] uppercase">
            <XCircle className="h-3.5 w-3.5" />
            <span>Payment Cancel</span>
          </span>

          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="mt-4 text-4xl text-[#24020E] sm:text-5xl"
          >
            Payment Cancelled
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-[#24020E]/75 sm:text-sm">
            Your Stripe checkout was cancelled. No payment was processed and your
            account plan has not changed.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={dashboardHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#24020E] px-5 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-xs transition hover:bg-teal-800"
            >
              <Crown className="h-4 w-4 text-amber-300" />
              <span>Return to Dashboard</span>
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-5 py-3 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]"
            >
              <Home className="h-4 w-4 text-teal-800" />
              <span>Home</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
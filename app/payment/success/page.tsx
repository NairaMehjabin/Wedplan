"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Crown,
  Loader2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SessionUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  businessName?: string;
  subscriptionPlan?: "free" | "premium";
  subscriptionExpiresAt?: string | null;
}

interface TransactionSummary {
  plan?: string;
  amount?: number;
  currency?: string;
  status?: string;
  stripeSessionId?: string;
  createdAt?: string;
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

function PaymentSuccessLoading() {
  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="flex min-h-screen items-center justify-center px-4 pt-20"
    >
      <div className="flex items-center gap-2.5 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/90 px-5 py-3.5 text-xs font-semibold shadow-2xs backdrop-blur-md">
        <Loader2 className="h-4 w-4 animate-spin text-teal-800" />
        <span>Loading payment confirmation...</span>
      </div>
    </div>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [syncing, setSyncing] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [transaction, setTransaction] = useState<TransactionSummary | null>(
    null
  );

  const syncSubscriptionState = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCheckingAuth(false);
      setSyncing(false);
      router.replace("/sign-in");
      return;
    }

    const cached = readStoredUser();
    if (cached) {
      setUser(cached);
    }
    setCheckingAuth(false);
    setSyncing(true);

    try {
      const url = sessionId
        ? `${API_BASE}/api/subscriptions/session-status?session_id=${encodeURIComponent(
            sessionId
          )}`
        : `${API_BASE}/api/auth/me`;

      const res = await fetch(url, {
        cache: "no-store",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const updatedUser = (data?.user || data?.data) as
          | SessionUser
          | undefined;
        if (updatedUser && typeof window !== "undefined") {
          window.localStorage.setItem(
            "wedplan_user",
            JSON.stringify(updatedUser)
          );
          window.dispatchEvent(new Event("wedplan-auth-changed"));
          setUser(updatedUser);
        }
        if (data?.transaction) {
          setTransaction(data.transaction as TransactionSummary);
        }
      }
    } catch {
      toast.error(
        "Could not refresh subscription status right now. Please try again."
      );
    } finally {
      setSyncing(false);
    }
  }, [router, sessionId]);

  useEffect(() => {
    void syncSubscriptionState();
  }, [syncSubscriptionState]);

  if (checkingAuth) {
    return <PaymentSuccessLoading />;
  }

  const isPremium = user?.subscriptionPlan === "premium";
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
              "radial-gradient(circle, rgba(186, 238, 233, 0.6) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(254, 243, 199, 0.65) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-10 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-3xl border border-[#24020E]/15 bg-white/85 p-6 shadow-sm backdrop-blur-md sm:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-1 text-[10px] font-bold tracking-widest text-teal-950 uppercase">
              <CheckCircle2 className="h-3.5 w-3.5 text-teal-700" />
              <span>Payment Success</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full border border-amber-700/30 bg-[#FEF9EC] px-3 py-1 text-[10px] font-bold tracking-wider text-amber-900 uppercase">
              <Crown className="h-3.5 w-3.5 text-amber-700" />
              <span>{isPremium ? "Premium Plan" : "Webhook Sync"}</span>
            </span>
          </div>

          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="mt-4 text-4xl text-[#24020E] sm:text-5xl"
          >
            Checkout Completed
          </h1>

          <p className="mt-2 text-xs leading-relaxed text-[#24020E]/75 sm:text-sm">
            Thank you for your payment. Your subscription status and transaction
            record are updated via verified Stripe webhook events on the server.
          </p>

          <div className="mt-6 space-y-2.5 rounded-2xl border border-[#24020E]/10 bg-[#FFF4F7]/75 p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold tracking-wider text-[#24020E]/65 uppercase">
                Current Plan
              </span>
              <span className="font-bold text-teal-950 uppercase">
                {syncing
                  ? "Checking..."
                  : isPremium
                    ? "Premium"
                    : user?.subscriptionPlan || "free"}
              </span>
            </div>

            {sessionId && (
              <div className="flex flex-col justify-between gap-1 border-t border-[#24020E]/10 pt-2 sm:flex-row sm:items-center">
                <span className="font-bold tracking-wider text-[#24020E]/65 uppercase">
                  Session ID
                </span>
                <span className="truncate font-mono text-[11px] text-[#24020E]/80">
                  {sessionId}
                </span>
              </div>
            )}

            {transaction?.amount !== undefined && (
              <div className="flex items-center justify-between gap-2 border-t border-[#24020E]/10 pt-2">
                <span className="font-bold tracking-wider text-[#24020E]/65 uppercase">
                  Amount
                </span>
                <span className="font-bold text-[#24020E]">
                  {transaction.currency ? `${transaction.currency} ` : ""}
                  {Number(transaction.amount).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 border-t border-[#24020E]/10 pt-2">
              <span className="font-bold tracking-wider text-[#24020E]/65 uppercase">
                Security
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-teal-900">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                <span>Verified via Stripe Webhook</span>
              </span>
            </div>
          </div>

          {!syncing && !isPremium && (
            <div className="mt-4 flex flex-col justify-between gap-3 rounded-2xl border border-amber-700/25 bg-[#FEF9EC] p-4 text-xs text-amber-950 sm:flex-row sm:items-center">
              <span className="inline-flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Webhook confirmation may still be arriving. Click refresh to
                  check your latest plan status.
                </span>
              </span>
              <button
                type="button"
                onClick={() => void syncSubscriptionState()}
                className="shrink-0 cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-3.5 py-2 text-[11px] font-bold text-[#24020E] transition hover:bg-[#E3F6F5]"
              >
                Refresh Status
              </button>
            </div>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={dashboardHref}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#24020E] px-5 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-xs transition hover:bg-teal-800"
            >
              <LayoutDashboard className="h-4 w-4 text-[#99F6E4]" />
              <span>Go to Dashboard</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<PaymentSuccessLoading />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
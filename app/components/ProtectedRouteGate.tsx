"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useAuth, type AuthUser } from "../context/AuthContext";

export type AllowedRole = "admin" | "vendor" | "customer";

interface ProtectedRouteGateProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
  allowBlocked?: boolean;
  /** Optional: if provided, only this user ID (or admin) may view the route */
  ownerUserId?: string;
}

function normalizeRole(role?: string): AllowedRole | null {
  if (!role) return null;
  const r = role.trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "vendor") return "vendor";
  if (r === "customer") return "customer";
  return null;
}

function getUserId(user?: AuthUser | null): string {
  return String(user?.id || user?._id || "").trim();
}

function getDefaultDashboard(role: AllowedRole): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "vendor") return "/dashboard/vendor";
  return "/dashboard/customer";
}

export default function ProtectedRouteGate({
  children,
  allowedRoles,
  allowBlocked = false,
  ownerUserId,
}: ProtectedRouteGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  const [decision, setDecision] = useState<
    "checking" | "authorized" | "blocked" | "forbidden" | "redirecting"
  >("checking");

  // Stabilize allowedRoles by value so inline array props don't re-trigger effects
  const rolesKey = allowedRoles ? allowedRoles.join(",") : "";
  const stabilizedRoles = useMemo<AllowedRole[] | undefined>(() => {
    if (!rolesKey) return undefined;
    return rolesKey
      .split(",")
      .map((r) => normalizeRole(r))
      .filter((r): r is AllowedRole => r !== null);
  }, [rolesKey]);

  const role = normalizeRole(user?.role);

  useEffect(() => {
    if (isLoading) {
      setDecision("checking");
      return;
    }

    if (!user) {
      setDecision("redirecting");
      router.replace(`/sign-in?redirect=${encodeURIComponent(pathname || "/")}`);
      return;
    }

    if (user.isBlocked && !allowBlocked) {
      setDecision("blocked");
      return;
    }

    if (stabilizedRoles && stabilizedRoles.length > 0) {
      if (!role || !stabilizedRoles.includes(role)) {
        setDecision("redirecting");
        router.replace(role ? getDefaultDashboard(role) : "/sign-in");
        return;
      }
    }

    if (ownerUserId && role !== "admin") {
      const currentId = getUserId(user);
      if (!currentId || currentId !== ownerUserId.trim()) {
        setDecision("redirecting");
        router.replace(role ? getDefaultDashboard(role) : "/");
        return;
      }
    }

    setDecision("authorized");
  }, [
    isLoading,
    user,
    role,
    stabilizedRoles,
    allowBlocked,
    ownerUserId,
    pathname,
    router,
  ]);

  if (decision === "checking" || decision === "redirecting") {
    return (
      <div
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen flex-col items-center justify-center px-6 pt-24"
      >
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-teal-700" />
        <p className="text-xs font-semibold tracking-[0.2em] text-[#24020E]/65 uppercase">
          {decision === "redirecting" ? "Redirecting..." : "Verifying access..."}
        </p>
      </div>
    );
  }

  if (decision === "blocked") {
    return (
      <div
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-6 pt-24"
      >
        <div className="max-w-md rounded-2xl border border-[#C84B31]/30 bg-[#FFF4F7]/90 p-8 text-center shadow-sm backdrop-blur-md">
          <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-[#C84B31]" />
          <h2
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="text-3xl text-[#24020E]"
          >
            Account Suspended
          </h2>
          <p className="mt-2 font-[var(--font-cormorant)] text-lg text-[#24020E]/80">
            Your account has been blocked from accessing protected WedPlan
            features. Please contact support if you believe this is a mistake.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#24020E] px-6 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase transition hover:bg-teal-800"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (decision === "forbidden") {
    return (
      <div
        style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-6 pt-24"
      >
        <div className="max-w-md rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/90 p-8 text-center shadow-sm backdrop-blur-md">
          <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-[#C84B31]" />
          <h2
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="text-3xl text-[#24020E]"
          >
            Access Restricted
          </h2>
          <p className="mt-2 font-[var(--font-cormorant)] text-lg text-[#24020E]/80">
            You do not have permission to open this page.
          </p>
          <Link
            href={role ? getDefaultDashboard(role) : "/"}
            className="mt-6 inline-block rounded-xl bg-[#24020E] px-6 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase transition hover:bg-teal-800"
          >
            Go to My Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
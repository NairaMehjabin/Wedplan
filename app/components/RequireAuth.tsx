"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

interface RequireAuthProps {
  children: React.ReactNode;
}

function hasClientSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem("wedplan_token");
  const user = window.localStorage.getItem("wedplan_user");
  return Boolean(token || user);
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [authorized, setAuthorized] = useState<boolean>(() => hasClientSession());

  useEffect(() => {
    const verifySession = () => {
      const authed = hasClientSession();
      setAuthorized(authed);

      if (!authed) {
        const query = searchParams?.toString();
        const currentTarget = `${pathname}${query ? `?${query}` : ""}`;
        const redirectQuery =
          currentTarget && currentTarget.startsWith("/")
            ? `?redirect=${encodeURIComponent(currentTarget)}`
            : "";
        router.replace(`/sign-in${redirectQuery}`);
      }
    };

    verifySession();
    window.addEventListener("wedplan-auth-changed", verifySession);
    window.addEventListener("storage", verifySession);

    return () => {
      window.removeEventListener("wedplan-auth-changed", verifySession);
      window.removeEventListener("storage", verifySession);
    };
  }, [pathname, searchParams, router]);

  if (!authorized) {
    return (
      <div
        style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
        className="flex min-h-screen items-center justify-center px-4"
      >
        <div className="inline-flex items-center gap-2.5 rounded-full border-2 border-[#24020E] bg-[#FCF9F4] px-5 py-2.5 text-xs font-black tracking-widest uppercase shadow-[4px_4px_0px_0px_#24020E]">
          <Loader2 className="h-4 w-4 animate-spin text-[#C84B31]" />
          <span>Redirecting to Sign In...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
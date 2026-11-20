"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import AuthFormView from "../components/AuthFormView";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
          className="flex min-h-screen flex-col items-center justify-center pt-28"
        >
          <Loader2 className="mb-3 h-9 w-9 animate-spin text-[#C84B31]" />
          <p className="text-[10px] font-black tracking-[0.28em] uppercase">
            Preparing invitation ledger...
          </p>
        </div>
      }
    >
      <AuthFormView initialMode="sign-in" />
    </Suspense>
  );
}
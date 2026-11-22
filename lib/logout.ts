import { authClient } from "@/lib/auth-client";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function logoutWedPlanSession(redirectTo = "/sign-in") {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem("wedplan_skip_auto_login", "1");
    window.localStorage.removeItem("wedplan_pending_role");
    window.localStorage.removeItem("wedplan_token");
    window.localStorage.removeItem("wedplan_user");
    document.cookie =
      "wedplan_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    window.dispatchEvent(new Event("wedplan-auth-changed"));
  }

  try {
    await authClient.signOut();
  } catch {
    // Ignore if Better Auth session is already gone
  }

  try {
    await fetch(`${API_BASE}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network errors during logout
  }

  if (typeof window !== "undefined") {
    window.location.replace(redirectTo);
  }
}
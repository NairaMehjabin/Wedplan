import { NextResponse, type NextRequest } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SessionPayload {
  user?: {
    id?: string;
    _id?: string;
    role?: string;
    isBlocked?: boolean;
  };
  data?: {
    user?: {
      id?: string;
      _id?: string;
      role?: string;
      isBlocked?: boolean;
    };
  };
}

function normalizeRole(role?: string): "admin" | "vendor" | "customer" | null {
  if (!role) return null;
  const r = role.trim().toLowerCase();
  if (r === "admin") return "admin";
  if (r === "vendor") return "vendor";
  if (r === "customer") return "customer";
  return null;
}

function dashboardPathForRole(role: "admin" | "vendor" | "customer"): string {
  if (role === "admin") return "/dashboard";
  if (role === "vendor") return "/dashboard/vendor";
  return "/dashboard/customer";
}

function getBearerOrCookieToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  const cookieNames = [
    "wedplan_token",
    "token",
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ];
  for (const name of cookieNames) {
    const val = req.cookies.get(name)?.value;
    if (val && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

async function verifyUserSession(req: NextRequest): Promise<{
  authenticated: boolean;
  role: "admin" | "vendor" | "customer" | null;
  isBlocked: boolean;
}> {
  const token = getBearerOrCookieToken(req);
  const cookieHeader = req.headers.get("cookie") || "";

  if (!token && !cookieHeader) {
    return { authenticated: false, role: null, isBlocked: false };
  }

  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      return { authenticated: false, role: null, isBlocked: false };
    }

    const body = (await res.json().catch(() => null)) as SessionPayload | null;
    const rawUser = body?.user || body?.data?.user || null;

    if (!rawUser) {
      return { authenticated: false, role: null, isBlocked: false };
    }

    return {
      authenticated: true,
      role: normalizeRole(rawUser.role),
      isBlocked: Boolean(rawUser.isBlocked),
    };
  } catch {
    return { authenticated: false, role: null, isBlocked: false };
  }
}

function buildSignInRedirect(req: NextRequest): NextResponse {
  const signInUrl = new URL("/sign-in", req.url);
  const fullPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  signInUrl.searchParams.set("redirect", fullPath);
  return NextResponse.redirect(signInUrl);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isServiceDetailRoute = /^\/services\/[^/]+$/.test(pathname);
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isProfileRoute =
    pathname === "/profile" || pathname.startsWith("/profile/");
  const isPaymentRoute =
    pathname === "/payment/success" || pathname === "/payment/cancel";

  const isProtectedRoute =
    isServiceDetailRoute || isDashboardRoute || isProfileRoute || isPaymentRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  const session = await verifyUserSession(req);

  if (!session.authenticated) {
    return buildSignInRedirect(req);
  }

  if (session.isBlocked) {
    const blockedUrl = new URL("/sign-in", req.url);
    blockedUrl.searchParams.set("blocked", "1");
    return NextResponse.redirect(blockedUrl);
  }

  // Dashboard role isolation:
  // /dashboard -> Admin only
  // /dashboard/vendor -> Vendor only
  // /dashboard/customer -> Customer only
  if (isDashboardRoute && session.role) {
    const ownDashboard = dashboardPathForRole(session.role);

    if (pathname === "/dashboard" && session.role !== "admin") {
      return NextResponse.redirect(new URL(ownDashboard, req.url));
    }

    if (pathname.startsWith("/dashboard/vendor") && session.role !== "vendor") {
      return NextResponse.redirect(new URL(ownDashboard, req.url));
    }

    if (
      pathname.startsWith("/dashboard/customer") &&
      session.role !== "customer"
    ) {
      return NextResponse.redirect(new URL(ownDashboard, req.url));
    }
  }

  // Admin profile route (/profile) restricted to admin
  if (pathname === "/profile" && session.role && session.role !== "admin") {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(session.role), req.url)
    );
  }

  // Payment routes restricted to vendors
  if (isPaymentRoute && session.role && session.role !== "vendor") {
    return NextResponse.redirect(
      new URL(dashboardPathForRole(session.role), req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/services/:id*",
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/payment/success",
    "/payment/cancel",
  ],
};
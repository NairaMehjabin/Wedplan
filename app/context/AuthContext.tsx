"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/axios";

export interface AuthUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: "customer" | "vendor" | "admin" | string;
  image?: string | null;
  photoUrl?: string | null;
  profilePicture?: string | null;
  avatar?: string | null;
  img?: string | null;
  isBlocked?: boolean;
  businessName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem("wedplan_user") ||
      window.localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeStoredUser(nextUser: AuthUser | null): void {
  if (typeof window === "undefined") return;
  if (!nextUser) {
    window.localStorage.removeItem("wedplan_user");
    window.localStorage.removeItem("user");
    return;
  }
  const serialized = JSON.stringify(nextUser);
  window.localStorage.setItem("wedplan_user", serialized);
  window.localStorage.setItem("user", serialized);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<AuthUser | null>(null);
  userRef.current = user;

  const setUser: React.Dispatch<React.SetStateAction<AuthUser | null>> =
    useCallback((value) => {
      const resolved =
        typeof value === "function"
          ? (value as (prevState: AuthUser | null) => AuthUser | null)(
              userRef.current
            )
          : value;
      userRef.current = resolved;
      writeStoredUser(resolved);
      setUserState(resolved);
    }, []);

  const refreshUser = useCallback(async () => {
    const cached = readStoredUser();
    if (cached) {
      userRef.current = cached;
      setUserState(cached);
    }

    const token =
      typeof window !== "undefined"
        ? window.localStorage.getItem("wedplan_token") ||
          window.localStorage.getItem("token")
        : null;

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get("/api/auth/me");
      const fresh = res.data?.user || res.data?.data;
      if (fresh) {
        userRef.current = fresh;
        writeStoredUser(fresh);
        setUserState(fresh);
      }
    } catch {
      // Keep cached user if offline or server session is still in localStorage
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();

    const handleAuthChanged = () => {
      const updated = readStoredUser();
      userRef.current = updated;
      setUserState(updated);
      setIsLoading(false);
    };

    window.addEventListener("wedplan-auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleAuthChanged);

    return () => {
      window.removeEventListener("wedplan-auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleAuthChanged);
    };
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/sign-out");
    } catch {
      // Ignore network errors on sign-out and clear local session anyway
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("wedplan_user");
      window.localStorage.removeItem("user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }

    userRef.current = null;
    setUserState(null);
    router.push("/sign-in");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, setUser, isLoading, refreshUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
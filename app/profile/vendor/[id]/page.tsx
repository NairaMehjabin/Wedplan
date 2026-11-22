"use client";

import React, { Suspense, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  LogOut,
  Sparkles,
  Store,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Edit3,
  SlidersHorizontal,
  Grid,
  Search,
  Filter,
  ArrowUpDown,
  Inbox,
  MapPin,
  RotateCcw,
  ImagePlus,
  X,
  ZoomIn,
  Move,
  ArrowLeft,
  AlertTriangle,
  Save,
  Loader2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const FALLBACK_SERVICE_IMAGE =
  "https://i.pinimg.com/736x/75/b6/2b/75b62baf81b9aacb79b6338d4df69043.jpg";

const WEDDING_SERVICE_CATEGORIES = [
  "Photography & Videography",
  "Wedding Venues",
  "Decoration & Florist",
  "Catering Services",
  "Makeup & Styling",
  "Wedding Fashion",
];

interface SessionUser {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  image?: string | null;
  photoUrl?: string | null;
  profilePicture?: string | null;
  avatar?: string | null;
  businessName?: string;
}

interface VendorProfileInfo {
  _id?: string;
  id?: string;
  name?: string;
  businessName?: string;
  image?: string | null;
  photoUrl?: string | null;
  profilePicture?: string | null;
  avatar?: string | null;
  role?: string;
}

export interface VendorServiceItem {
  _id: string;
  vendorId?: string;
  serviceName: string;
  price: number;
  img: string;
  images?: string[];
  location: string;
  category: string;
  status?: string;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
}

interface ImageFraming {
  zoom: number;
  offsetX: number; // percentage of frame width (-45 to 45)
  offsetY: number; // percentage of frame height (-45 to 45)
}

const DEFAULT_FRAMING: ImageFraming = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function normalizeServiceItem(raw: Record<string, unknown>): VendorServiceItem {
  const imagesArr = Array.isArray(raw.images)
    ? raw.images.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const primaryImg =
    imagesArr[0] ||
    (typeof raw.img === "string" && raw.img.trim()) ||
    (typeof raw.image === "string" && raw.image.trim()) ||
    FALLBACK_SERVICE_IMAGE;

  return {
    _id: String(raw._id || raw.id || ""),
    vendorId: raw.vendorId ? String(raw.vendorId) : undefined,
    serviceName: String(raw.serviceName || raw.title || "Untitled Service"),
    price: Number(raw.price ?? 0),
    img: primaryImg,
    images: imagesArr.length > 0 ? imagesArr : [primaryImg],
    location: String(raw.location || ""),
    category: String(raw.category || "Wedding Fashion"),
    status: raw.status ? String(raw.status) : "approved",
    isActive: typeof raw.isActive === "boolean" ? raw.isActive : true,
    description: raw.description ? String(raw.description) : "",
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

function readCurrentUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function getUserId(u?: SessionUser | VendorProfileInfo | null): string {
  return String(u?.id || u?._id || "");
}

function buildDicebearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    seed || "WedPlanVendor"
  )}`;
}

async function bakeFramedImageToDataUrl(
  src: string,
  framing: ImageFraming,
  outputSize = 400
): Promise<string | null> {
  if (framing.zoom === 1 && framing.offsetX === 0 && framing.offsetY === 0) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        const natRatio = img.naturalWidth / (img.naturalHeight || 1);
        let baseW = outputSize;
        let baseH = outputSize;
        if (natRatio > 1) {
          baseW = outputSize * natRatio;
          baseH = outputSize;
        } else {
          baseW = outputSize;
          baseH = outputSize / (natRatio || 1);
        }

        const tx = (framing.offsetX / 100) * outputSize;
        const ty = (framing.offsetY / 100) * outputSize;

        ctx.clearRect(0, 0, outputSize, outputSize);
        ctx.save();
        ctx.translate(outputSize / 2 + tx, outputSize / 2 + ty);
        ctx.scale(framing.zoom, framing.zoom);
        ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
        ctx.restore();

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function VendorProfileLoadingFallback() {
  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="flex min-h-screen flex-col items-center justify-center gap-3 pt-28"
    >
      <div className="text-3xl">✨</div>
      <p className="text-xs font-semibold tracking-[0.2em] text-[#24020E]/60 uppercase">
        Opening Vendor Atelier...
      </p>
    </div>
  );
}

function VendorProfileContent() {
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  // Deterministic initial state across SSR and initial client hydration
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const vendorId = params?.id ? String(params.id) : getUserId(currentUser);
  const isOwner = Boolean(
    currentUser && vendorId && getUserId(currentUser) === vendorId
  );

  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    photoUrl: "",
  });

  // Image zoom & pan/move state
  const [framing, setFraming] = useState<ImageFraming>(DEFAULT_FRAMING);
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  // Password update fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [services, setServices] = useState<VendorServiceItem[]>([]);
  const [publicVendorInfo, setPublicVendorInfo] =
    useState<VendorProfileInfo | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Guard to prevent infinite fetch loops or stuck loading states
  const fetchedKeyRef = useRef<string | null>(null);

  // Edit Service Modal state
  const [editingService, setEditingService] = useState<VendorServiceItem | null>(
    null
  );
  const [editServiceForm, setEditServiceForm] = useState({
    serviceName: "",
    category: WEDDING_SERVICE_CATEGORIES[0],
    price: "",
    location: "",
    description: "",
    imageUrl: "",
    isActive: true,
  });
  const [savingServiceEdit, setSavingServiceEdit] = useState(false);

  // Delete Service Confirmation Modal state (no window.confirm)
  const [serviceToDelete, setServiceToDelete] =
    useState<VendorServiceItem | null>(null);
  const [deletingService, setDeletingService] = useState(false);

  // Search, filter & sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [minPrice, setMinPrice] = useState<number | "">("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<string>("newest");

  const resetEditFormToSaved = (userObj: SessionUser | null) => {
    const savedImg =
      userObj?.image ||
      userObj?.photoUrl ||
      userObj?.profilePicture ||
      userObj?.avatar ||
      "";
    setFormData({
      name: userObj?.name || "",
      businessName: userObj?.businessName || "",
      photoUrl: String(savedImg).includes("ui-avatars.com")
        ? ""
        : String(savedImg),
    });
    setFraming(DEFAULT_FRAMING);
    setPassword("");
    setConfirmPassword("");
  };

  const exitEditingMode = () => {
    resetEditFormToSaved(currentUser);
    setIsEditing(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load current signed-in user from storage/API after mount
  useEffect(() => {
    if (!mounted) return;
    let active = true;

    async function syncSession() {
      const cached = readCurrentUser();
      if (cached && active) {
        setCurrentUser(cached);
      }

      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("wedplan_token")
          : null;

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: "include",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json().catch(() => null);
            const fresh = data?.user || data?.data;
            if (active && fresh) {
              setCurrentUser(fresh);
              window.localStorage.setItem(
                "wedplan_user",
                JSON.stringify(fresh)
              );
            }
          }
        } catch {
          // Keep cached session if offline/local
        }
      }

      if (active) setAuthLoaded(true);
    }

    void syncSession();
    return () => {
      active = false;
    };
  }, [mounted]);

  // Populate owner edit form
  useEffect(() => {
    if (!mounted || !authLoaded) return;

    if (!currentUser && !params?.id) {
      router.replace("/sign-in");
      return;
    }

    if (currentUser && isOwner) {
      resetEditFormToSaved(currentUser);
    }
  }, [mounted, authLoaded, currentUser, isOwner, params?.id, router]);

  // Fetch public vendor info & dynamic services once per (vendorId, isOwner)
  const fetchVendorAndServices = useCallback(
    async (signal?: AbortSignal, force = false) => {
      if (!mounted || !authLoaded) return;

      if (!vendorId) {
        setServices([]);
        setLoadingServices(false);
        return;
      }

      const fetchKey = `${vendorId}:${isOwner ? "owner" : "public"}`;
      if (!force && fetchedKeyRef.current === fetchKey) {
        setLoadingServices(false);
        return;
      }

      fetchedKeyRef.current = fetchKey;
      setLoadingServices(true);

      try {
        const token =
          typeof window !== "undefined"
            ? window.localStorage.getItem("wedplan_token")
            : null;

        let resolvedVendorInfo: VendorProfileInfo | null = null;

        if (!isOwner) {
          try {
            const userRes = await fetch(
              `${API_BASE}/api/auth/user/${encodeURIComponent(vendorId)}`,
              { credentials: "include", signal }
            );
            if (userRes.ok) {
              const userData = await userRes.json().catch(() => null);
              const candidate = userData?.user || userData?.data || userData;
              if (candidate && typeof candidate === "object") {
                resolvedVendorInfo = candidate as VendorProfileInfo;
                if (!signal?.aborted) {
                  setPublicVendorInfo(resolvedVendorInfo);
                }
              }
            }
          } catch {
            // Public vendor lookup fallback handled below
          }
        }

        let rawList: Record<string, unknown>[] = [];

        if (isOwner && token) {
          const mineRes = await fetch(`${API_BASE}/api/services/vendor/mine`, {
            cache: "no-store",
            credentials: "include",
            signal,
            headers: { Authorization: `Bearer ${token}` },
          });
          if (mineRes.ok) {
            const mineData = await mineRes.json().catch(() => null);
            if (Array.isArray(mineData?.data)) {
              rawList = mineData.data;
            } else if (Array.isArray(mineData?.services)) {
              rawList = mineData.services;
            }
          }
        }

        if (rawList.length === 0) {
          const allRes = await fetch(`${API_BASE}/api/services?limit=100`, {
            cache: "no-store",
            signal,
          });
          if (allRes.ok) {
            const allData = await allRes.json().catch(() => null);
            const allItems: Record<string, unknown>[] = Array.isArray(
              allData?.data
            )
              ? allData.data
              : Array.isArray(allData?.services)
                ? allData.services
                : [];

            const targetName = (
              (isOwner
                ? currentUser?.businessName || currentUser?.name
                : resolvedVendorInfo?.businessName ||
                  resolvedVendorInfo?.name) || ""
            )
              .trim()
              .toLowerCase();

            rawList = allItems.filter((item) => {
              const itemVendorId = String(item.vendorId || "");
              if (itemVendorId && itemVendorId === vendorId) return true;

              if (!targetName) return false;
              const itemBiz = String(item.businessName || "")
                .trim()
                .toLowerCase();
              const itemVendorName = String(item.vendorName || "")
                .trim()
                .toLowerCase();
              return itemBiz === targetName || itemVendorName === targetName;
            });
          }
        }

        const normalized = rawList
          .map(normalizeServiceItem)
          .filter((srv) => {
            if (!srv._id) return false;
            if (!isOwner) {
              return (
                String(srv.status || "").toLowerCase() === "approved" &&
                srv.isActive !== false
              );
            }
            return true;
          });

        if (!signal?.aborted) {
          setServices(normalized);
        }
      } catch (err) {
        if ((err as { name?: string })?.name !== "AbortError") {
          toast.error("Could not load vendor services.");
          if (!signal?.aborted) {
            setServices([]);
          }
        }
      } finally {
        if (!signal?.aborted) {
          setLoadingServices(false);
        }
      }
    }, [mounted, authLoaded, vendorId, isOwner, currentUser]);

  useEffect(() => {
    if (!mounted || !authLoaded) return;
    const controller = new AbortController();
    void fetchVendorAndServices(controller.signal);
    return () => {
      controller.abort();
    };
  }, [mounted, authLoaded, fetchVendorAndServices]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setCurrentUser(null);
    toast.success("Signed out.");
    router.push("/sign-in");
  };

  const categories = useMemo(() => {
    const merged = new Set<string>([
      ...WEDDING_SERVICE_CATEGORIES,
      ...services.map((s) => s.category).filter(Boolean),
    ]);
    return ["All", ...Array.from(merged)];
  }, [services]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    locationFilter.trim() !== "" ||
    selectedCategory !== "All" ||
    minPrice !== "" ||
    maxPrice !== "";

  const resetFilters = () => {
    setSearchQuery("");
    setLocationFilter("");
    setSelectedCategory("All");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  };

  const filteredAndSortedServices = useMemo(() => {
    const parsedMin =
      minPrice === "" || Number.isNaN(Number(minPrice)) ? null : Number(minPrice);
    const parsedMax =
      maxPrice === "" || Number.isNaN(Number(maxPrice)) ? null : Number(maxPrice);

    return services
      .filter((item) => {
        if (!item) return false;

        const matchesCategory =
          selectedCategory === "All" ||
          (item.category || "").trim().toLowerCase() ===
            selectedCategory.trim().toLowerCase();

        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          (item.serviceName || "").toLowerCase().includes(q) ||
          (item.category || "").toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q);

        const locQ = locationFilter.trim().toLowerCase();
        const matchesLocation =
          !locQ || (item.location || "").toLowerCase().includes(locQ);

        const priceVal = Number(item.price ?? 0);
        const matchesMin = parsedMin === null || priceVal >= parsedMin;
        const matchesMax = parsedMax === null || priceVal <= parsedMax;

        return (
          matchesCategory &&
          matchesSearch &&
          matchesLocation &&
          matchesMin &&
          matchesMax
        );
      })
      .sort((a, b) => {
        const priceA = Number(a.price ?? 0);
        const priceB = Number(b.price ?? 0);
        if (sortBy === "price-low") return priceA - priceB;
        if (sortBy === "price-high") return priceB - priceA;
        if (sortBy === "newest") {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      });
  }, [
    services,
    searchQuery,
    locationFilter,
    selectedCategory,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  if (!mounted || !authLoaded) {
    return <VendorProfileLoadingFallback />;
  }

  const activeSource = isOwner ? currentUser : publicVendorInfo;
  const displayVendorName =
    activeSource?.businessName ||
    activeSource?.name ||
    (isOwner ? "Your Atelier" : "Verified Wedding Vendor");
  const displayOwnerName = activeSource?.name || "Vendor";

  const resolveAvatar = () => {
    const candidate = isOwner
      ? formData.photoUrl ||
        currentUser?.image ||
        currentUser?.photoUrl ||
        currentUser?.profilePicture ||
        currentUser?.avatar
      : publicVendorInfo?.image ||
        publicVendorInfo?.photoUrl ||
        publicVendorInfo?.profilePicture ||
        publicVendorInfo?.avatar;

    if (
      candidate &&
      String(candidate).trim() !== "" &&
      !String(candidate).includes("ui-avatars.com")
    ) {
      return String(candidate).trim();
    }
    return buildDicebearAvatar(displayVendorName);
  };

  const displayAvatar = resolveAvatar();
  const displayRole = String(activeSource?.role || "vendor").toUpperCase();

  const currentSavedImg =
    currentUser?.image ||
    currentUser?.photoUrl ||
    currentUser?.profilePicture ||
    currentUser?.avatar ||
    "";

  const normalizedSavedImg = String(currentSavedImg).includes("ui-avatars.com")
    ? ""
    : String(currentSavedImg).trim();

  const isFramingAdjusted =
    framing.zoom !== 1 || framing.offsetX !== 0 || framing.offsetY !== 0;

  const isFormChanged =
    formData.name.trim() !== (currentUser?.name || "") ||
    formData.businessName.trim() !== (currentUser?.businessName || "") ||
    formData.photoUrl.trim() !== normalizedSavedImg ||
    isFramingAdjusted ||
    password.trim() !== "";

  const framingStyle: React.CSSProperties | undefined =
    isOwner && isEditing
      ? {
          transform: `translate(${framing.offsetX}%, ${framing.offsetY}%) scale(${framing.zoom})`,
          transformOrigin: "center center",
        }
      : undefined;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: framing.offsetX,
      origY: framing.offsetY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;

    const deltaPctX = ((e.clientX - dragStateRef.current.startX) / width) * 100;
    const deltaPctY =
      ((e.clientY - dragStateRef.current.startY) / height) * 100;

    const nextX = Math.max(
      -45,
      Math.min(45, Math.round(dragStateRef.current.origX + deltaPctX))
    );
    const nextY = Math.max(
      -45,
      Math.min(45, Math.round(dragStateRef.current.origY + deltaPctY))
    );

    setFraming((prev) => ({
      ...prev,
      offsetX: nextX,
      offsetY: nextY,
    }));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    dragStateRef.current.dragging = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormChanged || updating || !isOwner || !currentUser) return;

    if (!formData.name.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    if (password.trim() !== "") {
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      if (password.length < 6) {
        toast.error("New password must be at least 6 characters.");
        return;
      }
    }

    try {
      setUpdating(true);
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("wedplan_token")
          : null;

      let finalImageValue: string | null = formData.photoUrl.trim() || null;
      if (finalImageValue && isFramingAdjusted) {
        const baked = await bakeFramedImageToDataUrl(finalImageValue, framing);
        if (baked) {
          finalImageValue = baked;
        }
      }

      const payload = {
        userId: getUserId(currentUser),
        name: formData.name.trim(),
        businessName: formData.businessName.trim(),
        image: finalImageValue,
        ...(password.trim() !== "" ? { password } : {}),
      };

      const res = await fetch(`${API_BASE}/api/auth/update-profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      const mergedUser: SessionUser = {
        ...currentUser,
        ...(data?.user || data?.data || {}),
        name: formData.name.trim(),
        businessName: formData.businessName.trim(),
        image: finalImageValue,
      };

      if (!res.ok || data?.success === false) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "wedplan_user",
            JSON.stringify(mergedUser)
          );
          window.dispatchEvent(new Event("wedplan-auth-changed"));
        }
        setCurrentUser(mergedUser);
        toast.error(
          data?.message ||
            "Updated locally, though the server returned an error."
        );
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("wedplan_user", JSON.stringify(mergedUser));
        window.dispatchEvent(new Event("wedplan-auth-changed"));
      }
      setCurrentUser(mergedUser);
      setFraming(DEFAULT_FRAMING);
      setPassword("");
      setConfirmPassword("");
      setIsEditing(false);
      toast.success("Vendor profile updated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile changes."
      );
    } finally {
      setUpdating(false);
    }
  };

  const openEditServiceModal = (srv: VendorServiceItem) => {
    if (!isOwner) return;
    setEditingService(srv);
    setEditServiceForm({
      serviceName: srv.serviceName || "",
      category: WEDDING_SERVICE_CATEGORIES.includes(srv.category)
        ? srv.category
        : WEDDING_SERVICE_CATEGORIES[0],
      price: String(srv.price ?? ""),
      location: srv.location || "",
      description: srv.description || "",
      imageUrl: srv.img || srv.images?.[0] || "",
      isActive: srv.isActive !== false,
    });
  };

  const handleSaveServiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwner || !editingService || savingServiceEdit) return;

    const cleanName = editServiceForm.serviceName.trim();
    const cleanCategory = editServiceForm.category.trim();
    const cleanLocation = editServiceForm.location.trim();
    const cleanDescription = editServiceForm.description.trim();
    const numericPrice = Number(editServiceForm.price);

    if (!cleanName || !cleanCategory || !cleanLocation || !cleanDescription) {
      toast.error("Please fill in service name, category, location, and description.");
      return;
    }

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Please enter a valid non-negative price.");
      return;
    }

    try {
      setSavingServiceEdit(true);
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("wedplan_token")
          : null;

      const resolvedImg =
        editServiceForm.imageUrl.trim() ||
        editingService.img ||
        FALLBACK_SERVICE_IMAGE;

      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(editingService._id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            serviceName: cleanName,
            category: cleanCategory,
            price: numericPrice,
            location: cleanLocation,
            description: cleanDescription,
            images: [resolvedImg],
            isActive: editServiceForm.isActive,
          }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        toast.error(data?.message || "Failed to update service.");
        return;
      }

      const updatedRecord = data?.data || data?.service;
      setServices((prev) =>
        prev.map((item) => {
          if (item._id !== editingService._id) return item;
          if (updatedRecord && typeof updatedRecord === "object") {
            return normalizeServiceItem(
              updatedRecord as Record<string, unknown>
            );
          }
          return {
            ...item,
            serviceName: cleanName,
            category: cleanCategory,
            price: numericPrice,
            location: cleanLocation,
            description: cleanDescription,
            img: resolvedImg,
            images: [resolvedImg],
            isActive: editServiceForm.isActive,
          };
        })
      );

      setEditingService(null);
      toast.success("Service updated successfully!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update service."
      );
    } finally {
      setSavingServiceEdit(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!isOwner || !serviceToDelete || deletingService) return;

    try {
      setDeletingService(true);
      const token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("wedplan_token")
          : null;

      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(serviceToDelete._id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        toast.error(data?.message || "Failed to delete service.");
        return;
      }

      const deletedId = serviceToDelete._id;
      setServices((prev) => prev.filter((s) => s._id !== deletedId));
      setServiceToDelete(null);
      toast.success("Service deleted.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete service."
      );
    } finally {
      setDeletingService(false);
    }
  };

  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip px-4 pt-24 pb-16 sm:px-6 sm:pt-28 md:px-8"
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
          className="absolute -top-20 -left-20 h-[380px] w-[380px] rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.52) 0%, transparent 72%)",
          }}
          className="absolute right-[-80px] bottom-6 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-start gap-6 sm:gap-8 lg:grid-cols-12">
        {/* LEFT COLUMN: VENDOR PROFILE & OWNER CONTROLS */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 lg:sticky lg:top-24 lg:col-span-4"
        >
          <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-sm backdrop-blur-md sm:p-6">
            <div className="flex flex-col items-center space-y-3.5 text-center">
              <div className="relative">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#24020E]/20 bg-[#E3F6F5] shadow-sm sm:h-28 sm:w-28">
                  <img
                    src={displayAvatar}
                    alt={displayVendorName}
                    style={framingStyle}
                    className="h-full w-full object-cover transition-transform duration-150"
                    onError={(e) => {
                      e.currentTarget.src = buildDicebearAvatar(
                        displayVendorName
                      );
                    }}
                  />
                </div>
                <span className="mt-2 inline-block rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-wider text-teal-900 uppercase">
                  {displayRole}
                </span>
              </div>

              <div className="w-full space-y-1">
                <h1
                  style={{ fontFamily: "var(--font-curly), cursive" }}
                  className="text-2xl leading-tight text-[#24020E] sm:text-3xl"
                >
                  {displayVendorName}
                </h1>
                <p className="text-xs font-semibold text-[#24020E]/75">
                  Hosted by {displayOwnerName}
                </p>
                {isOwner && currentUser?.email && (
                  <p className="pt-0.5 text-xs break-all text-[#24020E]/60 select-all">
                    {currentUser.email}
                  </p>
                )}
                <p className="pt-1 text-[10px] font-bold tracking-[0.18em] text-teal-800 uppercase">
                  {isOwner ? "Owner Studio View" : "Public Vendor Showcase"}
                </p>
              </div>

              {isOwner && (
                <div className="flex w-full flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        exitEditingMode();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="w-full cursor-pointer rounded-xl border border-[#24020E]/20 bg-[#E3F6F5]/85 px-4 py-2.5 text-center text-xs font-semibold tracking-wider text-teal-950 uppercase shadow-2xs transition hover:bg-[#E3F6F5]"
                  >
                    {isEditing ? "Exit edit mode" : "Configure Vendor Profile"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/vendor")}
                    className="w-full cursor-pointer rounded-xl bg-[#24020E] px-4 py-2.5 text-center text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800"
                  >
                    Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#C84B31]/25 bg-white/80 px-4 py-2.5 text-center text-xs font-semibold tracking-wider text-[#C84B31] uppercase transition hover:bg-[#C84B31] hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {isOwner && isEditing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-2xl border border-[#24020E]/15 bg-white/75 p-5 shadow-sm backdrop-blur-md sm:p-6"
              >
                <div className="mb-4 flex items-center justify-between gap-2 border-b border-[#24020E]/10 pb-3">
                  <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-teal-900 uppercase">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
                    <span>Vendor Profile Parameters</span>
                  </h3>
                  <button
                    type="button"
                    onClick={exitEditingMode}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#24020E]/15 bg-[#FFF4F7] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]/75"
                  >
                    <ArrowLeft className="h-3 w-3 text-[#C84B31]" />
                    <span>Exit edit mode</span>
                  </button>
                </div>

                <form
                  noValidate
                  onSubmit={handleUpdateProfile}
                  className="space-y-4"
                >
                  {/* Responsive Live Avatar Framing (Drag + Zoom + Move X/Y) */}
                  <div className="space-y-3 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-3.5 backdrop-blur-xs">
                    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                      <div
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        title="Drag to move image"
                        className="relative h-24 w-24 shrink-0 cursor-grab touch-none overflow-hidden rounded-2xl border border-[#24020E]/20 bg-[#E3F6F5] shadow-2xs active:cursor-grabbing sm:h-20 sm:w-20"
                      >
                        <img
                          src={displayAvatar}
                          alt="Adjustable profile preview"
                          draggable={false}
                          style={{
                            transform: `translate(${framing.offsetX}%, ${framing.offsetY}%) scale(${framing.zoom})`,
                            transformOrigin: "center center",
                          }}
                          className="h-full w-full object-cover select-none"
                          onError={(e) => {
                            e.currentTarget.src = buildDicebearAvatar(
                              formData.businessName || formData.name || "Vendor"
                            );
                          }}
                        />
                      </div>

                      <div className="w-full min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#24020E] uppercase">
                            <ImagePlus className="h-3 w-3 text-teal-800" />
                            <span>Profile Image URL</span>
                          </label>
                          {formData.photoUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  photoUrl: "",
                                }));
                                setFraming(DEFAULT_FRAMING);
                              }}
                              className="inline-flex cursor-pointer items-center gap-0.5 text-[10px] font-semibold text-[#C84B31] hover:underline"
                            >
                              <X className="h-3 w-3" />
                              <span>Clear</span>
                            </button>
                          )}
                        </div>

                        <input
                          type="url"
                          value={formData.photoUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              photoUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/vendor-photo.jpg"
                          className="w-full rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-2 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFraming(DEFAULT_FRAMING);
                              setFormData((prev) => ({
                                ...prev,
                                photoUrl: buildDicebearAvatar(
                                  `${prev.businessName || prev.name || "Atelier"}-${Date.now().toString().slice(-3)}`
                                ),
                              }));
                            }}
                            className="cursor-pointer rounded-lg border border-[#24020E]/15 bg-[#E3F6F5]/80 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-teal-950 uppercase transition hover:bg-[#E3F6F5]"
                          >
                            New Avatar
                          </button>

                          {isFramingAdjusted && (
                            <button
                              type="button"
                              onClick={() => setFraming(DEFAULT_FRAMING)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#24020E]/15 bg-white/85 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7]"
                            >
                              <RotateCcw className="h-2.5 w-2.5 text-[#C84B31]" />
                              <span>Reset Crop</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Zoom & Move X / Y Sliders */}
                    <div className="space-y-2.5 border-t border-[#24020E]/10 pt-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-[#24020E]/75 uppercase">
                          <span className="inline-flex items-center gap-1">
                            <ZoomIn className="h-3 w-3 text-teal-800" />
                            <span>Zoom</span>
                          </span>
                          <span>{framing.zoom.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={2.5}
                          step={0.05}
                          value={framing.zoom}
                          onChange={(e) =>
                            setFraming((prev) => ({
                              ...prev,
                              zoom: Number(e.target.value),
                            }))
                          }
                          className="w-full cursor-pointer accent-teal-700"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-[#24020E]/75 uppercase">
                            <span className="inline-flex items-center gap-1">
                              <Move className="h-3 w-3 text-[#24020E]" />
                              <span>Move X</span>
                            </span>
                            <span>{framing.offsetX}%</span>
                          </div>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            step={1}
                            value={framing.offsetX}
                            onChange={(e) =>
                              setFraming((prev) => ({
                                ...prev,
                                offsetX: Number(e.target.value),
                              }))
                            }
                            className="w-full cursor-pointer accent-[#24020E]"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider text-[#24020E]/75 uppercase">
                            <span className="inline-flex items-center gap-1">
                              <Move className="h-3 w-3 text-[#24020E]" />
                              <span>Move Y</span>
                            </span>
                            <span>{framing.offsetY}%</span>
                          </div>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            step={1}
                            value={framing.offsetY}
                            onChange={(e) =>
                              setFraming((prev) => ({
                                ...prev,
                                offsetY: Number(e.target.value),
                              }))
                            }
                            className="w-full cursor-pointer accent-[#24020E]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                      Email Address
                    </label>
                    <input
                      type="text"
                      value={currentUser?.email || ""}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-[#24020E]/10 bg-[#E3F6F5]/55 p-3 text-xs text-[#24020E]/60 select-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Your name"
                      className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-3 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                      Business / Atelier Name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="e.g., Velvet Petal Florals"
                      className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-3 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#24020E]/10 pt-4">
                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        New Password (Optional)
                      </label>
                      <div className="relative overflow-hidden rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 focus-within:border-teal-700 focus-within:bg-white">
                        <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-3.5 text-[#24020E]/45 absolute">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-transparent py-2.5 pr-10 pl-10 text-xs text-[#24020E] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-[#24020E]/55 hover:text-[#24020E]"
                        >
                          {showPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 ml-1 block text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Confirm New Password
                      </label>
                      <div className="relative overflow-hidden rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 focus-within:border-teal-700 focus-within:bg-white">
                        <div className="pointer-events-none inset-y-0 left-0 flex items-center pl-3.5 text-[#24020E]/45 absolute">
                          <Lock className="h-3.5 w-3.5" />
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-transparent py-2.5 pr-10 pl-10 text-xs text-[#24020E] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 text-[#24020E]/55 hover:text-[#24020E]"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {isFormChanged ? (
                    <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                      <button
                        type="submit"
                        disabled={updating}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
                      >
                        <Store className="h-3.5 w-3.5 text-[#99F6E4]" />
                        <span>{updating ? "Saving..." : "Save Changes"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={updating}
                        onClick={exitEditingMode}
                        className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-white/85 px-4 py-3 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7] disabled:opacity-60"
                      >
                        <span>Exit edit mode</span>
                      </button>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={exitEditingMode}
                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#24020E]/15 bg-white/85 py-2.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7]"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-[#C84B31]" />
                        <span>Exit edit mode</span>
                      </button>
                    </div>
                  )}
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT COLUMN: VENDOR SERVICES CATALOG (BOUNDED SCROLLABLE CONTAINER) */}
        <div className="flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-[#24020E]/15 bg-white/75 p-4 shadow-sm backdrop-blur-md sm:p-6 lg:col-span-8 lg:max-h-[calc(100vh-8.5rem)]">
          {/* Top Header + Search */}
          <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-[#24020E]/10 pb-4 sm:gap-4 md:flex-row md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Grid className="h-4 w-4 text-teal-700" />
              <h2 className="text-xs font-bold tracking-[0.18em] text-[#24020E] uppercase">
                Offered Wedding Services
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-800/20 bg-[#E3F6F5]/85 px-2.5 py-0.5 text-[10px] font-semibold text-teal-950">
                <Sparkles className="h-3 w-3 text-teal-700" />
                <span>{services.length} Listed</span>
              </span>
            </div>

            <div className="relative w-full md:w-60">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#24020E]/45" />
              <input
                type="text"
                placeholder="Search by name or detail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 py-2 pr-3 pl-9 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
              />
            </div>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex shrink-0 flex-col gap-3 border-b border-[#24020E]/10 py-3.5 sm:gap-3.5 sm:py-4">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Filter className="mr-1 h-3.5 w-3.5 shrink-0 text-teal-700" />
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-wider uppercase transition sm:px-3.5 ${
                    selectedCategory === cat
                      ? "bg-[#24020E] text-[#FCF9F4] shadow-2xs"
                      : "border border-[#24020E]/15 bg-[#FFF4F7]/80 text-[#24020E]/75 hover:border-teal-700/40 hover:bg-[#E3F6F5]/65"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Location, Price Range & Sort */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="relative w-full sm:w-40">
                  <MapPin className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-teal-700" />
                  <input
                    type="text"
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 py-1.5 pr-2.5 pl-8 text-[11px] font-medium text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white sm:py-1"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-[#24020E]/55" />
                  <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                    Price:
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Min ৳"
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-20 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-2 py-1 text-[11px] font-semibold text-[#24020E] outline-none focus:border-teal-700 focus:bg-white"
                  />
                  <span className="text-[10px] font-bold text-[#24020E]/45">
                    to
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Max ৳"
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-20 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-2 py-1 text-[11px] font-semibold text-[#24020E] outline-none focus:border-teal-700 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-[#24020E]/55" />
                <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                  Sort:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#24020E] uppercase outline-none focus:border-teal-700 focus:bg-white"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                </select>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#C84B31]/30 bg-[#FFF4F7] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[#C84B31] uppercase transition hover:bg-[#C84B31] hover:text-[#FCF9F4]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Services Container */}
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 sm:mt-5 sm:pr-1.5">
            {loadingServices ? (
              <div className="flex items-center justify-center gap-2 py-20 text-xs tracking-wider italic opacity-60">
                <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                <span>Loading services showcase...</span>
              </div>
            ) : filteredAndSortedServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/70 p-10 text-center sm:p-14">
                <Inbox className="mb-2 h-6 w-6 text-teal-700/60" />
                <p className="text-xs font-semibold tracking-widest text-[#24020E]/60 uppercase italic">
                  {hasActiveFilters
                    ? "No services match your current filters."
                    : "No services published for this vendor yet."}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="mt-4 cursor-pointer rounded-xl border border-[#24020E]/20 bg-[#E3F6F5] px-4 py-1.5 text-[10px] font-semibold tracking-wider text-teal-950 uppercase shadow-2xs"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 pb-3 md:grid-cols-2 sm:gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredAndSortedServices.map((srv) => (
                    <motion.div
                      key={srv._id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.35 }}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden border-b border-[#24020E]/10 bg-[#E3F6F5]/60">
                        <img
                          src={srv.img || FALLBACK_SERVICE_IMAGE}
                          alt={srv.serviceName}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_SERVICE_IMAGE;
                          }}
                        />
                        <span className="absolute top-3 left-3 rounded-full border border-teal-800/20 bg-[#FCF9F4]/90 px-3 py-0.5 text-[10px] font-semibold tracking-wider text-teal-950 uppercase backdrop-blur-xs">
                          {srv.category}
                        </span>
                        {isOwner && srv.status && (
                          <span className="absolute top-3 right-3 rounded-full border border-[#24020E]/15 bg-white/90 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#24020E] uppercase backdrop-blur-xs">
                            {srv.status}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                        <div>
                          <h4
                            style={{ fontFamily: "var(--font-curly), cursive" }}
                            className="line-clamp-1 text-xl text-[#24020E] sm:text-2xl"
                          >
                            {srv.serviceName}
                          </h4>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#24020E]/65">
                            <MapPin className="h-3 w-3 text-teal-700" />
                            <span>{srv.location}</span>
                          </p>
                          <p className="mt-1.5 text-sm font-bold text-[#C84B31]">
                            ৳{srv.price?.toLocaleString("en-BD")} BDT
                          </p>
                          {srv.description && (
                            <p className="mt-2 line-clamp-2 font-[var(--font-cormorant)] text-base leading-snug text-[#24020E]/80">
                              {srv.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-auto grid grid-cols-1 gap-2 border-t border-[#24020E]/10 pt-3">
                          <Link
                            href={`/services/${srv._id}`}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#24020E] py-2.5 text-[10px] font-semibold tracking-widest text-[#FCF9F4] uppercase transition hover:bg-teal-800"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#99F6E4]" />
                            <span>Inspect Service</span>
                          </Link>

                          {isOwner && (
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => openEditServiceModal(srv)}
                                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-[#E3F6F5]/80 py-2 text-[10px] font-semibold tracking-wider text-teal-950 uppercase transition hover:bg-[#E3F6F5]"
                              >
                                <Edit3 className="h-3 w-3 text-teal-700" />
                                <span>Modify</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setServiceToDelete(srv)}
                                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#C84B31]/25 bg-white/80 py-2 text-[10px] font-semibold tracking-wider text-[#C84B31] uppercase transition hover:bg-[#C84B31] hover:text-white"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Remove</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT SERVICE MODAL */}
      <AnimatePresence>
        {isOwner && editingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!savingServiceEdit) setEditingService(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/50 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4] p-6 text-[#24020E] shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-[#24020E]/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase">
                    Update Listing
                  </span>
                  <h3
                    style={{ fontFamily: "var(--font-curly), cursive" }}
                    className="text-2xl text-[#24020E]"
                  >
                    Modify Service
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={savingServiceEdit}
                  onClick={() => setEditingService(null)}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white/80 p-2 text-[#24020E] transition hover:bg-[#FFF4F7] disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveServiceEdit} className="space-y-4">
                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={editServiceForm.serviceName}
                    onChange={(e) =>
                      setEditServiceForm((prev) => ({
                        ...prev,
                        serviceName: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                      Category
                    </label>
                    <select
                      value={editServiceForm.category}
                      onChange={(e) =>
                        setEditServiceForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                      className="w-full cursor-pointer rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    >
                      {WEDDING_SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                      Price (৳ BDT)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editServiceForm.price}
                      onChange={(e) =>
                        setEditServiceForm((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editServiceForm.location}
                    onChange={(e) =>
                      setEditServiceForm((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={editServiceForm.imageUrl}
                    onChange={(e) =>
                      setEditServiceForm((prev) => ({
                        ...prev,
                        imageUrl: e.target.value,
                      }))
                    }
                    placeholder="https://example.com/service.jpg"
                    className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="ml-1 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editServiceForm.description}
                    onChange={(e) =>
                      setEditServiceForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/85 px-3.5 py-2.5 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#24020E]/10 bg-white/80 px-3.5 py-2.5 text-xs font-semibold text-[#24020E]">
                  <input
                    type="checkbox"
                    checked={editServiceForm.isActive}
                    onChange={(e) =>
                      setEditServiceForm((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-teal-700"
                  />
                  <span>Active &amp; available for booking</span>
                </label>

                <div className="flex items-center justify-end gap-2.5 border-t border-[#24020E]/10 pt-4">
                  <button
                    type="button"
                    disabled={savingServiceEdit}
                    onClick={() => setEditingService(null)}
                    className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-4 py-2.5 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingServiceEdit}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#24020E] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase transition hover:bg-teal-800 disabled:opacity-60"
                  >
                    {savingServiceEdit ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 text-[#99F6E4]" />
                    )}
                    <span>{savingServiceEdit ? "Saving..." : "Save Changes"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE SERVICE CONFIRMATION POPUP MODAL */}
      <AnimatePresence>
        {isOwner && serviceToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!deletingService) setServiceToDelete(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/50 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4] p-6 text-[#24020E] shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#C84B31]/25 bg-[#FFF4F7] text-[#C84B31]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3
                    style={{ fontFamily: "var(--font-curly), cursive" }}
                    className="text-2xl text-[#24020E]"
                  >
                    Delete Service?
                  </h3>
                  <p className="text-xs leading-relaxed text-[#24020E]/75">
                    Are you sure you want to permanently remove{" "}
                    <strong className="text-[#24020E]">
                      &ldquo;{serviceToDelete.serviceName}&rdquo;
                    </strong>
                    ? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#24020E]/10 pt-4">
                <button
                  type="button"
                  disabled={deletingService}
                  onClick={() => setServiceToDelete(null)}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-4 py-2 text-xs font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#FFF4F7] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingService}
                  onClick={handleConfirmDeleteService}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C84B31] px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase transition hover:bg-[#a63a24] disabled:opacity-60"
                >
                  {deletingService ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  <span>{deletingService ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function VendorProfilePage() {
  return (
    <Suspense fallback={<VendorProfileLoadingFallback />}>
      <VendorProfileContent />
    </Suspense>
  );
}
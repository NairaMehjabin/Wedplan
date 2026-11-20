"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import {
  LogOut,
  Eye,
  EyeOff,
  Lock,
  SlidersHorizontal,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Heart,
  ZoomIn,
  Move,
  RotateCcw,
  ImagePlus,
  X,
  ArrowLeft,
  CalendarHeart,
  Sparkles,
  Check,
} from "lucide-react";
import api from "../../../../lib/axios";

interface CustomerProfileInfo {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  image?: string | null;
  photoUrl?: string;
  profilePicture?: string;
  avatar?: string;
  img?: string;
  role?: string;
}

interface ToastState {
  text: string;
  type: "success" | "error" | "loading";
}

interface ImageFraming {
  zoom: number;
  offsetX: number; // percentage (-45 to 45)
  offsetY: number; // percentage (-45 to 45)
}

const DEFAULT_FRAMING: ImageFraming = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
};

function buildDicebearAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
    seed || "Customer"
  )}`;
}

function extractSavedImage(obj: any): string {
  return (
    obj?.image ||
    obj?.profilePicture ||
    obj?.photoUrl ||
    obj?.avatar ||
    obj?.img ||
    ""
  );
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

function ProfileLoadingFallback() {
  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="flex min-h-screen flex-col items-center justify-center gap-3 px-4"
    >
      <motion.div
        animate={{ scale: [1, 1.06, 1], rotate: [0, 4, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5] shadow-sm"
      >
        <Sparkles className="h-6 w-6 text-teal-700" />
      </motion.div>
      <p className="animate-pulse text-xs font-semibold tracking-[0.2em] text-[#24020E]/60 uppercase">
        Loading Customer Profile...
      </p>
    </main>
  );
}

function CustomerProfileContent() {
  const { user, isLoading, logout, setUser } = useAuth() as {
    user: any;
    isLoading: boolean;
    logout: () => void;
    setUser: (u: any) => void;
  };
  const router = useRouter();
  const params = useParams<{ id?: string }>();

  const currentUserId = String(user?.id || user?._id || "");
  const profileCustomerId = String(params?.id || currentUserId || "");
  const isOwner = Boolean(
    user && profileCustomerId && currentUserId === profileCustomerId
  );

  const [formData, setFormData] = useState({
    name: "",
    image: "",
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

  const [publicCustomerInfo, setPublicCustomerInfo] =
    useState<CustomerProfileInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<ToastState | null>(null);

  const syncedOwnerIdRef = useRef<string>("");
  const isEditingRef = useRef<boolean>(false);
  isEditingRef.current = isEditing;

  const triggerToast = (
    text: string,
    type: "success" | "error" | "loading",
    duration = 3200
  ) => {
    setToastMessage({ text, type });
    if (type !== "loading") {
      setTimeout(() => {
        setToastMessage((current) => (current?.text === text ? null : current));
      }, duration);
    }
  };

  const resetEditFormToSaved = (userObj: any) => {
    const savedDbImage = extractSavedImage(userObj);
    setFormData({
      name: userObj?.name || "",
      image: String(savedDbImage).includes("ui-avatars.com")
        ? ""
        : String(savedDbImage),
    });
    setFraming(DEFAULT_FRAMING);
    setPassword("");
    setConfirmPassword("");
  };

  const exitEditingMode = () => {
    resetEditFormToSaved(user);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isLoading) return;

    if (!user && !params?.id) {
      router.push("/sign-in");
      return;
    }

    if (user && isOwner && currentUserId) {
      if (!isEditingRef.current && syncedOwnerIdRef.current !== currentUserId) {
        resetEditFormToSaved(user);
      }

      if (syncedOwnerIdRef.current === currentUserId) {
        return;
      }
      syncedOwnerIdRef.current = currentUserId;

      void (async () => {
        try {
          const response = await api.get(`/api/auth/user/${currentUserId}`);
          const freshUser = response.data?.user || response.data;

          if (freshUser) {
            const merged = { ...user, ...freshUser };
            setUser(merged);
            if (!isEditingRef.current) {
              resetEditFormToSaved(merged);
            }
          }
        } catch (err) {
          console.error("Failed to sync fresh customer dataset:", err);
        }
      })();
    }
  }, [isLoading, user, isOwner, params?.id, currentUserId, router, setUser]);

  useEffect(() => {
    const fetchCustomerInfoOnly = async () => {
      if (!profileCustomerId || isOwner) return;
      try {
        const res = await api.get(`/api/auth/user/${profileCustomerId}`);
        if (res.data) {
          setPublicCustomerInfo(res.data.user || res.data);
        }
      } catch (e) {
        console.error("Could not fetch public customer profile info", e);
      }
    };

    void fetchCustomerInfoOnly();
  }, [profileCustomerId, isOwner]);

  if (isLoading) {
    return <ProfileLoadingFallback />;
  }

  const activeSource = isOwner ? user : publicCustomerInfo;
  const displayProfileName = isOwner
    ? user?.name || "Customer"
    : publicCustomerInfo?.name || "Customer";

  const getAvatarUrl = () => {
    const isValidUrl = (url: any) =>
      url &&
      String(url).trim() !== "" &&
      !String(url).includes("ui-avatars.com");

    if (isOwner) {
      if (formData.image && formData.image.trim() !== "") {
        return formData.image.trim();
      }
      const savedOwnerImage = extractSavedImage(user);
      if (isValidUrl(savedOwnerImage)) return String(savedOwnerImage).trim();
      return buildDicebearAvatar(user?.name || "Customer");
    }

    const savedPublicImage = extractSavedImage(publicCustomerInfo);
    if (isValidUrl(savedPublicImage)) {
      return String(savedPublicImage).trim();
    }
    return buildDicebearAvatar(publicCustomerInfo?.name || "Customer");
  };

  const displayProfilePicture = getAvatarUrl();
  const displayProfileRole = String(
    activeSource?.role || "customer"
  ).toUpperCase();

  const currentDbImageValue = extractSavedImage(user);
  const normalizedDbImage = String(currentDbImageValue).includes("ui-avatars.com")
    ? ""
    : String(currentDbImageValue).trim();

  const isFramingAdjusted =
    framing.zoom !== 1 || framing.offsetX !== 0 || framing.offsetY !== 0;

  const isFormChanged =
    formData.name.trim() !== (user?.name || "") ||
    formData.image.trim() !== normalizedDbImage ||
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
    if (!isFormChanged || updating || !isOwner || !user) return;

    if (!formData.name.trim()) {
      triggerToast("Please enter your name.", "error");
      return;
    }

    if (password.trim() !== "") {
      if (password !== confirmPassword) {
        triggerToast("Passwords do not match.", "error");
        return;
      }
      if (password.length < 6) {
        triggerToast("New password must be at least 6 characters.", "error");
        return;
      }
    }

    setUpdating(true);
    triggerToast("Updating customer profile...", "loading");

    try {
      let finalImageUrl = formData.image.trim();
      if (finalImageUrl && isFramingAdjusted) {
        const baked = await bakeFramedImageToDataUrl(finalImageUrl, framing);
        if (baked) {
          finalImageUrl = baked;
        }
      }

      const payload = {
        userId: user.id || user._id,
        name: formData.name.trim(),
        image: finalImageUrl || null,
        ...(password.trim() !== "" && { password }),
      };

      const response = await api.put("/api/auth/update-profile", payload, {
        withCredentials: true,
      });

      if (response.data?.success) {
        const savedImageValue =
          response.data.user?.image ?? (finalImageUrl || null);
        const updatedUser = {
          ...user,
          ...(response.data.user || {}),
          name: formData.name.trim(),
          image: savedImageValue,
          role: user.role || "customer",
        };
        setUser(updatedUser);

        setFraming(DEFAULT_FRAMING);
        setPassword("");
        setConfirmPassword("");
        setIsEditing(false);
        setUpdating(false);
        triggerToast("Customer profile saved successfully.", "success");
      } else {
        setUpdating(false);
        triggerToast(
          response.data?.message || "Could not save customer profile.",
          "error"
        );
      }
    } catch (err: any) {
      const errTxt =
        err?.response?.data?.message || "Failed to sync changes with server.";
      triggerToast(errTxt, "error");
      setUpdating(false);
    }
  };

  return (
    <main
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip px-4 pt-28 pb-20 sm:px-6 sm:pt-32"
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
              "radial-gradient(circle, rgba(255, 224, 232, 0.6) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.54) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-8 h-[440px] w-[440px] rounded-full blur-3xl"
        />
      </div>

      {/* WedPlan Keepsake Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -24, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -16, x: "-50%" }}
            className="fixed top-24 left-1/2 z-50 flex w-[92vw] max-w-md items-center gap-2.5 rounded-2xl border border-[#24020E]/15 bg-white/90 px-5 py-3 shadow-md backdrop-blur-md"
          >
            {toastMessage.type === "loading" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" />
            ) : toastMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-700" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-[#C84B31]" />
            )}
            <p className="text-xs font-semibold tracking-wide text-[#24020E]">
              {toastMessage.text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          {/* LEFT CARD: WEDPLAN KEEPSAKE IDENTITY CARD */}
          <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-6 shadow-sm backdrop-blur-md sm:p-7 lg:col-span-5">
            <div className="flex flex-col items-center space-y-3.5 text-center">
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-[#24020E]/20 bg-[#E3F6F5] shadow-sm">
                  <img
                    src={displayProfilePicture}
                    alt={displayProfileName}
                    style={framingStyle}
                    className="h-full w-full object-cover transition-transform duration-150"
                    onError={(e) => {
                      e.currentTarget.src = buildDicebearAvatar(
                        displayProfileName
                      );
                    }}
                  />
                </div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-widest text-teal-900 uppercase">
                  <Heart className="h-3 w-3 fill-[#C95B78] text-[#C95B78]" />
                  <span>{displayProfileRole}</span>
                </span>
              </div>

              <div className="w-full space-y-1">
                <h1
                  style={{ fontFamily: "var(--font-curly), cursive" }}
                  className="text-3xl leading-tight text-[#24020E] sm:text-4xl"
                >
                  {displayProfileName}
                </h1>

                {isOwner && user?.email && (
                  <p className="text-xs font-medium break-all text-[#24020E]/70 select-all">
                    {user.email}
                  </p>
                )}

                <p className="pt-1 text-[10px] font-bold tracking-[0.2em] text-teal-800 uppercase">
                  {isOwner ? "WEDPLAN MEMBER VIEW" : "CUSTOMER PROFILE"}
                </p>
              </div>

              {isOwner && (
                <div className="flex w-full flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditing) {
                        exitEditingMode();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#24020E]/20 bg-[#E3F6F5]/85 px-5 py-3 text-xs font-semibold tracking-wider text-teal-950 uppercase shadow-2xs transition hover:bg-[#E3F6F5]"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-teal-700" />
                    <span>
                      {isEditing
                        ? "EXIT EDIT MODE"
                        : "CONFIGURE CUSTOMER PROFILE"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/customer")}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] px-5 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800"
                  >
                    <CalendarHeart className="h-3.5 w-3.5 text-[#99F6E4]" />
                    <span>MY DASHBOARD</span>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#C84B31]/25 bg-white/80 px-5 py-3 text-xs font-semibold tracking-wider text-[#C84B31] uppercase transition hover:bg-[#C84B31] hover:text-white"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>SIGN OUT</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT CARD: EDITABLE CUSTOMER ACCOUNT SETTINGS OR SUMMARY */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {isOwner && isEditing ? (
                <motion.div
                  key="edit-pane"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-[#24020E]/15 bg-white/75 p-6 shadow-sm backdrop-blur-md sm:p-8"
                >
                  <div className="mb-5 flex items-center justify-between gap-2 border-b border-[#24020E]/10 pb-3.5">
                    <span className="text-[11px] font-bold tracking-widest text-teal-800 uppercase">
                      Customer Account Settings
                    </span>
                    <button
                      type="button"
                      onClick={exitEditingMode}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7] px-3 py-1 text-[10px] font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]/75"
                    >
                      <ArrowLeft className="h-3 w-3 text-[#C84B31]" />
                      <span>Exit Edit Mode</span>
                    </button>
                  </div>

                  <form
                    noValidate
                    onSubmit={handleUpdateProfile}
                    className="space-y-4"
                  >
                    {/* Avatar URL + Zoom/Pan Framing */}
                    <div className="space-y-3 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-4 backdrop-blur-xs">
                      <div className="flex flex-col items-center gap-3.5 sm:flex-row sm:items-start">
                        <div
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          title="Drag to move avatar"
                          className="relative h-24 w-24 shrink-0 cursor-grab touch-none overflow-hidden rounded-2xl border border-[#24020E]/20 bg-[#E3F6F5] shadow-2xs active:cursor-grabbing sm:h-20 sm:w-20"
                        >
                          <img
                            src={displayProfilePicture}
                            alt="Avatar preview"
                            draggable={false}
                            style={{
                              transform: `translate(${framing.offsetX}%, ${framing.offsetY}%) scale(${framing.zoom})`,
                              transformOrigin: "center center",
                            }}
                            className="h-full w-full object-cover select-none"
                            onError={(e) => {
                              e.currentTarget.src = buildDicebearAvatar(
                                formData.name || "Customer"
                              );
                            }}
                          />
                        </div>

                        <div className="w-full min-w-0 flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#24020E] uppercase">
                              <ImagePlus className="h-3.5 w-3.5 text-teal-800" />
                              <span>Profile Image URL</span>
                            </label>
                            {formData.image && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    image: "",
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
                            value={formData.image}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                image: e.target.value,
                              })
                            }
                            placeholder="https://example.com/your-photo.jpg"
                            className="w-full rounded-xl border border-[#24020E]/15 bg-white/85 px-3.5 py-2 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                          />

                          {isFramingAdjusted && (
                            <button
                              type="button"
                              onClick={() => setFraming(DEFAULT_FRAMING)}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#24020E]/15 bg-white/85 px-3 py-1 text-[10px] font-semibold tracking-wider text-[#24020E] uppercase transition hover:bg-[#E3F6F5]/75"
                            >
                              <RotateCcw className="h-3 w-3 text-[#C84B31]" />
                              <span>Reset Framing</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2.5 border-t border-[#24020E]/10 pt-3">
                        <label className="block">
                          <span className="flex justify-between text-[11px] font-semibold">
                            <span className="inline-flex items-center gap-1">
                              <ZoomIn className="h-3 w-3 text-teal-800" />
                              <span>Zoom</span>
                            </span>
                            <span>{framing.zoom.toFixed(2)}x</span>
                          </span>
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
                            className="mt-1 w-full cursor-pointer accent-teal-700"
                          />
                        </label>

                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <label className="block">
                            <span className="flex justify-between text-[11px] font-semibold">
                              <span className="inline-flex items-center gap-1">
                                <Move className="h-3 w-3 text-[#24020E]" />
                                <span>Pan X</span>
                              </span>
                              <span>{framing.offsetX}%</span>
                            </span>
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
                              className="mt-1 w-full cursor-pointer accent-[#24020E]"
                            />
                          </label>

                          <label className="block">
                            <span className="flex justify-between text-[11px] font-semibold">
                              <span className="inline-flex items-center gap-1">
                                <Move className="h-3 w-3 text-[#24020E]" />
                                <span>Pan Y</span>
                              </span>
                              <span>{framing.offsetY}%</span>
                            </span>
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
                              className="mt-1 w-full cursor-pointer accent-[#24020E]"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Your full name"
                        className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-4 py-2.5 text-sm text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                      />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-[#24020E]/10 bg-[#E3F6F5]/55 px-4 py-2.5 text-sm text-[#24020E]/60 select-all"
                      />
                    </div>

                    {/* Optional Password Update */}
                    <div className="grid grid-cols-1 gap-3 border-t border-[#24020E]/10 pt-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#24020E]/45" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep"
                            className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 py-2.5 pr-10 pl-10 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#24020E]/55 hover:text-[#24020E]"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#24020E]/45" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
                            placeholder="Repeat new password"
                            className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 py-2.5 pr-10 pl-10 text-xs text-[#24020E] outline-none transition focus:border-teal-700 focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#24020E]/55 hover:text-[#24020E]"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {isFormChanged && (
                      <button
                        type="submit"
                        disabled={updating}
                        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-[#99F6E4]" />
                        )}
                        <span>
                          {updating ? "Saving Changes..." : "Save Changes"}
                        </span>
                      </button>
                    )}
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="summary-pane"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border border-[#24020E]/15 bg-white/75 p-6 shadow-sm backdrop-blur-md sm:p-8"
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[#24020E]/10 pb-3.5">
                      <span className="text-[11px] font-bold tracking-widest text-teal-800 uppercase">
                        Customer Account Details
                      </span>
                      <span className="rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-wider text-teal-950 uppercase">
                        {displayProfileRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/80 p-5 sm:grid-cols-2">
                      <div>
                        <span className="block text-[10px] font-bold tracking-widest text-[#24020E]/55 uppercase">
                          Full Name
                        </span>
                        <span className="mt-1 block text-sm font-bold text-[#24020E]">
                          {displayProfileName}
                        </span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold tracking-widest text-[#24020E]/55 uppercase">
                          Account Type
                        </span>
                        <span className="mt-1 block text-sm font-bold text-teal-800 uppercase">
                          {displayProfileRole}
                        </span>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="block text-[10px] font-bold tracking-widest text-[#24020E]/55 uppercase">
                          Email Address
                        </span>
                        <span className="mt-1 block text-sm font-semibold break-all text-[#24020E] select-all">
                          {user?.email || publicCustomerInfo?.email || "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <CustomerProfileContent />
    </Suspense>
  );
}
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Sparkles,
  Heart,
  Mail,
  Lock,
  User,
  Store,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Link2,
  RotateCcw,
  Crop,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";

export type AuthMode = "sign-in" | "sign-up";
type AccountRole = "customer" | "vendor";

function validatePassword(pw: string): string | null {
  if (pw.length < 6) {
    return "Password must be at least 6 characters long.";
  }
  if (!/[A-Z]/.test(pw)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(pw)) {
    return "Password must include at least one lowercase letter.";
  }
  return null;
}

function getRoleRedirect(role?: string, fallback?: string | null): string {
  if (fallback && fallback.startsWith("/") && !fallback.startsWith("//")) {
    return fallback;
  }
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "/dashboard/admin";
    case "vendor":
      return "/dashboard/vendor";
    case "customer":
    default:
      return "/dashboard/customer";
  }
}

interface AuthFormViewProps {
  initialMode?: AuthMode;
}

export default function AuthFormView({
  initialMode = "sign-in",
}: AuthFormViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [role, setRole] = useState<AccountRole>("customer");

  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Profile image via ImgBB OR direct URL + zoom/pan adjustment
  const [imageInputMode, setImageInputMode] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [previewError, setPreviewError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [applyingCrop, setApplyingCrop] = useState(false);
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const reportError = (msg: string) => {
    setFeedback({ type: "error", text: msg });
    toast.error(msg);
  };

  const reportSuccess = (msg: string) => {
    setFeedback({ type: "success", text: msg });
    toast.success(msg);
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFeedback(null);
  };

  const resetAdjustment = () => {
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  };

  const updatePreviewUrl = (nextUrl: string) => {
    setImageUrl(nextUrl);
    setPreviewError(false);
    resetAdjustment();
  };

  const uploadBlobToImgBB = async (
    fileOrBlob: Blob,
    filename = "profile.png"
  ): Promise<string> => {
    if (!IMGBB_API_KEY) {
      throw new Error(
        "ImgBB API key is not configured (NEXT_PUBLIC_IMGBB_API_KEY)."
      );
    }
    const formData = new FormData();
    formData.append("image", fileOrBlob, filename);

    const res = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
      {
        method: "POST",
        body: formData,
      }
    );
    const data = await res.json();

    if (!res.ok || !data?.success || !data?.data?.url) {
      throw new Error(data?.error?.message || "Failed to upload image to ImgBB.");
    }

    return String(data.data.url);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFeedback(null);

    if (!IMGBB_API_KEY) {
      reportError(
        "ImgBB API key is missing. Paste a direct image URL instead or register without a photo."
      );
      return;
    }

    try {
      setUploadingImage(true);
      const uploadedUrl = await uploadBlobToImgBB(file, file.name);
      setUrlDraft(uploadedUrl);
      updatePreviewUrl(uploadedUrl);
      reportSuccess("Profile photo uploaded via ImgBB! Adjust framing below if needed.");
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : "Image upload failed. Please try another file."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleApplyUrl = () => {
    setFeedback(null);
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      updatePreviewUrl("");
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("URL must start with http:// or https://");
      }
      updatePreviewUrl(trimmed);
      reportSuccess("Profile URL preview updated! Adjust framing below if needed.");
    } catch {
      reportError("Please enter a valid http:// or https:// image URL.");
    }
  };

  const handleSaveAdjustedCrop = async () => {
    if (!imageUrl || !previewImgRef.current || previewError) return;
    setFeedback(null);

    try {
      setApplyingCrop(true);
      const imgEl = previewImgRef.current;
      const canvas = document.createElement("canvas");
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable.");

      ctx.fillStyle = "#FCF9F4";
      ctx.fillRect(0, 0, size, size);

      const natW = imgEl.naturalWidth || size;
      const natH = imgEl.naturalHeight || size;
      const baseScale = Math.max(size / natW, size / natH);
      const finalScale = baseScale * zoom;
      const drawW = natW * finalScale;
      const drawH = natH * finalScale;

      const tx = (size - drawW) / 2 + (offsetX / 100) * size;
      const ty = (size - drawH) / 2 + (offsetY / 100) * size;

      ctx.drawImage(imgEl, tx, ty, drawW, drawH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png", 0.92)
      );
      if (!blob) {
        throw new Error("Could not render adjusted image.");
      }

      if (IMGBB_API_KEY) {
        const croppedUrl = await uploadBlobToImgBB(blob, "adjusted-pfp.png");
        setUrlDraft(croppedUrl);
        updatePreviewUrl(croppedUrl);
        reportSuccess("Adjusted photo saved to ImgBB!");
      } else {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(blob);
        });
        updatePreviewUrl(dataUrl);
        reportSuccess("Adjusted preview applied!");
      }
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : "Could not apply adjustment (some external hosts block canvas export; try uploading the file to ImgBB first)."
      );
    } finally {
      setApplyingCrop(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFeedback(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      reportError("Please enter both your email and password.");
      return;
    }

    if (mode === "sign-up") {
      if (!name.trim()) {
        reportError("Please enter your full name.");
        return;
      }
      if (role === "vendor" && !businessName.trim()) {
        reportError("Please enter your vendor or studio business name.");
        return;
      }
      const pwError = validatePassword(password);
      if (pwError) {
        reportError(pwError);
        return;
      }
    }

    try {
      setSubmitting(true);

      const endpoint =
        mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up";

      const resolvedImage =
        imageUrl.trim() || (imageInputMode === "url" ? urlDraft.trim() : "");

      const payload =
        mode === "sign-in"
          ? { email: trimmedEmail, password }
          : {
              name: name.trim(),
              email: trimmedEmail,
              password,
              role,
              ...(role === "vendor"
                ? { businessName: businessName.trim() }
                : {}),
              ...(resolvedImage ? { image: resolvedImage } : {}),
            };

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.message ||
            (mode === "sign-in"
              ? "Invalid email or password."
              : "Could not complete registration.")
        );
      }

      if (typeof window !== "undefined") {
        if (data?.token) {
          window.localStorage.setItem("wedplan_token", data.token);
        }
        if (data?.user) {
          window.localStorage.setItem("wedplan_user", JSON.stringify(data.user));
        }
        window.dispatchEvent(new Event("wedplan-auth-changed"));
      }

      const resolvedRole: string =
        data?.user?.role ||
        data?.data?.role ||
        (mode === "sign-up" ? role : "customer");

      const successText =
        mode === "sign-in"
          ? `Signed in as ${resolvedRole}! Redirecting...`
          : `Registered as ${resolvedRole}! Redirecting to your dashboard...`;
      reportSuccess(successText);

      const targetHref =
        data?.redirectTo || getRoleRedirect(resolvedRole, redirectParam);
      router.refresh();
      router.push(targetHref);
    } catch (err) {
      reportError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAuth = () => {
    toast("Redirecting to Google sign-in...", { icon: "✨" });
    const callbackUrl = encodeURIComponent(
      `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}${
        redirectParam || getRoleRedirect(role)
      }`
    );
    window.location.href = `${API_BASE}/api/auth/sign-in/social?provider=google&role=${role}&callbackURL=${callbackUrl}`;
  };

  return (
    <main
      style={{ backgroundColor: "#FFEDF1", color: "#24020E" }}
      className="relative flex min-h-screen flex-col justify-center overflow-x-clip px-4 pt-28 pb-20 sm:px-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(252, 249, 244, 0.88) 0%, rgba(252, 249, 244, 0.25) 58%, transparent 76%)",
          }}
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(232, 155, 174, 0.34) 0%, rgba(217, 122, 148, 0.14) 58%, transparent 76%)",
          }}
          className="absolute right-[-90px] bottom-8 h-[440px] w-[440px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-10 lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-6 text-center lg:col-span-5 lg:text-left"
        >
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#24020E] bg-[#FCF9F4] px-4 py-1.5 text-[10px] font-black tracking-widest text-[#24020E] uppercase shadow-[3px_3px_0px_0px_#24020E]">
            <Sparkles className="h-3.5 w-3.5 text-[#C84B31]" />
            <span>WedPlan Keepsake Registry</span>
          </div>

          <h1
            style={{ fontFamily: "var(--font-curly), cursive" }}
            className="text-4xl leading-[1.08] text-[#24020E] sm:text-6xl"
          >
            {mode === "sign-in"
              ? "Welcome Back to Your Day"
              : "Begin Your Wedding Story"}
          </h1>

          <p className="font-[var(--font-cormorant)] text-xl leading-relaxed font-medium text-[#24020E]/85 sm:text-2xl">
            {mode === "sign-in"
              ? "Sign in to manage bookings, review curated wedding services, or tend your vendor atelier."
              : "Join as a couple planning every detail or as a wedding vendor crafting unforgettable moments."}
          </p>

          <div className="relative mx-auto max-w-md rounded-[30px] border-2 border-dashed border-[#24020E]/30 bg-[#FCF9F4]/85 p-5 text-left shadow-[6px_6px_0px_0px_rgba(36,2,14,0.12)] lg:mx-0">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black tracking-[0.2em] text-[#C84B31] uppercase">
                Invitation Ledger Note
              </span>
              <Heart className="h-4 w-4 fill-[#C84B31] text-[#C84B31]" />
            </div>
            <p className="font-[var(--font-cormorant)] text-base italic text-[#24020E]/85">
              &ldquo;Every celebration begins with a quiet vow—and a thoughtful
              plan brought together in one keepsake space.&rdquo;
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-7"
        >
          <div className="relative overflow-hidden rounded-[40px] border-[3px] border-[#24020E] bg-[#FCF9F4]/95 p-5 shadow-[10px_10px_0px_0px_#24020E] sm:p-9">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-[8px] rounded-[32px] border border-dashed border-[#24020E]/20"
            />

            <div className="relative z-10">
              <div className="mb-7 grid grid-cols-2 gap-2 rounded-full border-2 border-[#24020E] bg-[#FFEDF1] p-1.5">
                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className={`cursor-pointer rounded-full py-2.5 text-xs font-black tracking-widest uppercase transition ${
                    mode === "sign-in"
                      ? "bg-[#24020E] text-[#FCF9F4] shadow-xs"
                      : "text-[#24020E]/75 hover:text-[#24020E]"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("sign-up")}
                  className={`cursor-pointer rounded-full py-2.5 text-xs font-black tracking-widest uppercase transition ${
                    mode === "sign-up"
                      ? "bg-[#24020E] text-[#FCF9F4] shadow-xs"
                      : "text-[#24020E]/75 hover:text-[#24020E]"
                  }`}
                >
                  Register
                </button>
              </div>

              <form noValidate onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {mode === "sign-up" && (
                    <motion.div
                      key="signup-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div>
                        <span className="mb-2 block text-[10px] font-black tracking-widest text-[#24020E] uppercase">
                          Account Role *
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setRole("customer")}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 py-3 text-xs font-black tracking-wider uppercase transition ${
                              role === "customer"
                                ? "border-[#24020E] bg-[#C84B31] text-[#FCF9F4] shadow-[3px_3px_0px_0px_#24020E]"
                                : "border-[#24020E]/25 bg-white text-[#24020E]/80 hover:border-[#24020E]"
                            }`}
                          >
                            <User className="h-4 w-4" />
                            <span>Customer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRole("vendor")}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 py-3 text-xs font-black tracking-wider uppercase transition ${
                              role === "vendor"
                                ? "border-[#24020E] bg-[#C84B31] text-[#FCF9F4] shadow-[3px_3px_0px_0px_#24020E]"
                                : "border-[#24020E]/25 bg-white text-[#24020E]/80 hover:border-[#24020E]"
                            }`}
                          >
                            <Store className="h-4 w-4" />
                            <span>Vendor</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="fullName"
                          className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                        >
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#24020E]/50" />
                          <input
                            id="fullName"
                            type="text"
                            placeholder="Your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white py-2.5 pr-4 pl-11 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                          />
                        </div>
                      </div>

                      {role === "vendor" && (
                        <div>
                          <label
                            htmlFor="businessName"
                            className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                          >
                            Business / Atelier Name *
                          </label>
                          <div className="relative">
                            <Store className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#24020E]/50" />
                            <input
                              id="businessName"
                              type="text"
                              placeholder="e.g., Velvet Petal Florals"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white py-2.5 pr-4 pl-11 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                      {/* Profile Picture: ImgBB Upload OR Direct URL + Live Preview & Adjust */}
                      <div className="space-y-3 rounded-3xl border-2 border-dashed border-[#24020E]/25 bg-white/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black tracking-widest uppercase">
                            Profile Image (Optional)
                          </span>
                          <div className="inline-flex rounded-full border border-[#24020E]/25 bg-[#FFEDF1] p-0.5 text-[10px] font-black uppercase">
                            <button
                              type="button"
                              onClick={() => setImageInputMode("upload")}
                              className={`cursor-pointer rounded-full px-3 py-1 transition ${
                                imageInputMode === "upload"
                                  ? "bg-[#24020E] text-[#FCF9F4]"
                                  : "text-[#24020E]/75"
                              }`}
                            >
                              ImgBB File
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageInputMode("url")}
                              className={`cursor-pointer rounded-full px-3 py-1 transition ${
                                imageInputMode === "url"
                                  ? "bg-[#24020E] text-[#FCF9F4]"
                                  : "text-[#24020E]/75"
                              }`}
                            >
                              Image URL
                            </button>
                          </div>
                        </div>

                        {imageInputMode === "upload" ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <label
                              htmlFor="profilePhoto"
                              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border-2 border-[#24020E] bg-[#FCF9F4] px-4 py-2 text-xs font-bold text-[#24020E] shadow-[2px_2px_0px_0px_#24020E] transition hover:bg-[#FFEDF1]"
                            >
                              {uploadingImage ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#C84B31]" />
                              ) : (
                                <Upload className="h-4 w-4 text-[#C84B31]" />
                              )}
                              <span>
                                {uploadingImage
                                  ? "Uploading..."
                                  : imageUrl
                                    ? "Replace Photo"
                                    : "Choose File"}
                              </span>
                            </label>
                            <input
                              id="profilePhoto"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative flex-1">
                              <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#24020E]/50" />
                              <input
                                type="url"
                                placeholder="https://example.com/photo.jpg"
                                value={urlDraft}
                                onChange={(e) => {
                                  const next = e.target.value;
                                  setUrlDraft(next);
                                  updatePreviewUrl(next.trim());
                                }}
                                className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white py-2 pr-3 pl-10 text-xs text-[#24020E] focus:border-[#24020E] focus:outline-none sm:text-sm"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyUrl}
                              className="cursor-pointer rounded-2xl border-2 border-[#24020E] bg-[#24020E] px-4 py-2 text-[11px] font-black tracking-wider text-[#FCF9F4] uppercase transition hover:opacity-90"
                            >
                              Preview URL
                            </button>
                          </div>
                        )}

                        {imageUrl && (
                          <div className="flex flex-col items-center gap-4 border-t border-dashed border-[#24020E]/15 pt-3.5 sm:flex-row sm:items-start">
                            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#24020E] bg-[#FFEDF1] shadow-[4px_4px_0px_0px_#24020E]">
                              {previewError ? (
                                <span className="px-2 text-center text-[10px] font-bold leading-tight text-[#C84B31]">
                                  Preview blocked by host
                                </span>
                              ) : (
                                <img
                                  ref={previewImgRef}
                                  src={imageUrl}
                                  alt="Profile preview"
                                  onLoad={() => setPreviewError(false)}
                                  onError={() => setPreviewError(true)}
                                  style={{
                                    transform: `translate(${offsetX}%, ${offsetY}%) scale(${zoom})`,
                                  }}
                                  className="h-full w-full object-cover transition-transform duration-100"
                                />
                              )}
                            </div>

                            <div className="w-full flex-1 space-y-2.5 text-xs">
                              {previewError && (
                                <p className="rounded-xl border border-[#C84B31]/40 bg-[#FFEDF1] px-3 py-2 text-[11px] font-semibold text-[#24020E]">
                                  This host blocked image previewing in the
                                  browser. Try a direct image URL or switch to{" "}
                                  <strong>ImgBB File</strong>.
                                </p>
                              )}

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black tracking-wider text-[#24020E]/75 uppercase">
                                  Adjust Framing
                                </span>
                                <button
                                  type="button"
                                  onClick={resetAdjustment}
                                  className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-[#C84B31] hover:underline"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Reset</span>
                                </button>
                              </div>

                              <label className="block">
                                <span className="flex justify-between text-[11px] font-semibold">
                                  <span>Zoom</span>
                                  <span>{zoom.toFixed(1)}x</span>
                                </span>
                                <input
                                  type="range"
                                  min={1}
                                  max={2.4}
                                  step={0.1}
                                  value={zoom}
                                  onChange={(e) =>
                                    setZoom(parseFloat(e.target.value))
                                  }
                                  className="mt-1 w-full accent-[#C84B31]"
                                />
                              </label>

                              <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                  <span className="flex justify-between text-[11px] font-semibold">
                                    <span>Pan X</span>
                                    <span>{offsetX}%</span>
                                  </span>
                                  <input
                                    type="range"
                                    min={-25}
                                    max={25}
                                    step={1}
                                    value={offsetX}
                                    onChange={(e) =>
                                      setOffsetX(parseInt(e.target.value, 10))
                                    }
                                    className="mt-1 w-full accent-[#24020E]"
                                  />
                                </label>

                                <label className="block">
                                  <span className="flex justify-between text-[11px] font-semibold">
                                    <span>Pan Y</span>
                                    <span>{offsetY}%</span>
                                  </span>
                                  <input
                                    type="range"
                                    min={-25}
                                    max={25}
                                    step={1}
                                    value={offsetY}
                                    onChange={(e) =>
                                      setOffsetY(parseInt(e.target.value, 10))
                                    }
                                    className="mt-1 w-full accent-[#24020E]"
                                  />
                                </label>
                              </div>

                              <button
                                type="button"
                                onClick={handleSaveAdjustedCrop}
                                disabled={applyingCrop || previewError}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-[#24020E] bg-[#FCF9F4] px-3.5 py-1.5 text-[10px] font-black tracking-wider text-[#24020E] uppercase shadow-[2px_2px_0px_0px_#24020E] transition hover:bg-[#FFEDF1] disabled:opacity-50"
                              >
                                {applyingCrop ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Crop className="h-3 w-3 text-[#C84B31]" />
                                )}
                                <span>
                                  {applyingCrop
                                    ? "Saving Crop..."
                                    : "Save Adjusted Crop"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                  >
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#24020E]/50" />
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white py-2.5 pr-4 pl-11 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-1 block text-[10px] font-black tracking-widest uppercase"
                  >
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[#24020E]/50" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 chars, 1 uppercase & 1 lowercase"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-2 border-[#24020E]/25 bg-white py-2.5 pr-11 pl-11 text-sm text-[#24020E] focus:border-[#24020E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute top-1/2 right-3.5 -translate-y-1/2 cursor-pointer text-[#24020E]/60 hover:text-[#24020E]"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {mode === "sign-up" && (
                    <p className="mt-1 text-[11px] font-medium text-[#24020E]/65">
                      Must include at least 6 characters, one uppercase letter,
                      and one lowercase letter.
                    </p>
                  )}
                </div>

                {feedback && (
                  <div
                    className={`flex items-start gap-2 rounded-2xl border-2 p-3.5 text-xs font-semibold sm:text-sm ${
                      feedback.type === "success"
                        ? "border-emerald-700/40 bg-emerald-50 text-emerald-950"
                        : "border-[#C84B31] bg-[#FFEDF1] text-[#24020E]"
                    }`}
                  >
                    {feedback.type === "success" ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#C84B31]" />
                    )}
                    <span>{feedback.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || uploadingImage || applyingCrop}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#24020E] bg-[#24020E] py-3.5 text-xs font-black tracking-widest text-[#FCF9F4] uppercase shadow-[5px_5px_0px_0px_#C84B31] transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 sm:text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>
                        {mode === "sign-in"
                          ? "Signing In..."
                          : "Creating Account..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === "sign-in"
                          ? "Sign In to WedPlan"
                          : `Register as ${role}`}
                      </span>
                      <ArrowRight className="h-4 w-4 text-[#E8D1A7]" />
                    </>
                  )}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#24020E]/15" />
                <span className="text-[10px] font-black tracking-widest text-[#24020E]/60 uppercase">
                  or continue with
                </span>
                <span className="h-px flex-1 bg-[#24020E]/15" />
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border-2 border-[#24020E] bg-white py-3 text-xs font-black tracking-wider text-[#24020E] uppercase shadow-[3px_3px_0px_0px_#24020E] transition hover:bg-[#FFEDF1] sm:text-sm"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#C84B31] text-[11px] font-black text-white">
                  G
                </span>
                <span>Continue with Google</span>
              </button>

              <p className="mt-5 text-center text-xs text-[#24020E]/70">
                <Link
                  href="/"
                  className="font-bold underline decoration-[#C84B31] underline-offset-4 hover:text-[#24020E]"
                >
                  Return to WedPlan Home
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
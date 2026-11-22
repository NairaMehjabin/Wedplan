"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  CalendarClock,
  Crown,
  LogOut,
  Menu,
  X,
  Upload,
  MapPin,
  Calendar,
  Mail,
  User,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Hourglass,
  Layers,
  Loader2,
  Home,
  Sparkles,
  Store,
  ShieldCheck,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "";
const FALLBACK_IMAGE =
  "https://i.pinimg.com/736x/75/b6/2b/75b62baf81b9aacb79b6338d4df69043.jpg";
const FREE_ACTIVE_LIMIT = 3;

type VendorTab =
  | "overview"
  | "add-service"
  | "my-services"
  | "bookings"
  | "subscription";

type ServiceApprovalStatus = "pending" | "approved" | "rejected";
type BookingStatus = "Pending" | "Accepted" | "Rejected" | "Cancelled";

interface VendorUser {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  role?: string;
  image?: string | null;
  businessName?: string;
  subscriptionPlan?: "free" | "premium";
  subscriptionExpiresAt?: string | null;
}

interface VendorService {
  _id: string;
  vendorId: string;
  vendorName?: string;
  businessName?: string;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  status: ServiceApprovalStatus;
  isActive: boolean;
  createdAt?: string;
}

interface VendorBookingRequest {
  _id: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  customerLocation?: string;
  location?: string;
  eventDate: string;
  eventLocation: string;
  message?: string;
  status: BookingStatus;
  createdAt?: string;
}

const SERVICE_CATEGORIES = [
  "Photography & Cinematography",
  "Bridal Makeup & Styling",
  "Catering & Desserts",
  "Stage & Venue Decor",
  "Mehndi & Henna",
  "Wedding Planner & Event",
  "DJ & Entertainment",
  "Bridal Wear & Attire",
];

function readStoredUser(): VendorUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("wedplan_user");
    if (!raw) return null;
    return JSON.parse(raw) as VendorUser;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("wedplan_token");
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function approvalBadgeStyle(status: ServiceApprovalStatus): {
  bg: string;
  text: string;
  border: string;
  label: string;
} {
  switch (status) {
    case "approved":
      return {
        bg: "#E3F6F5",
        text: "#0F514C",
        border: "rgba(15, 81, 76, 0.25)",
        label: "Approved",
      };
    case "rejected":
      return {
        bg: "#FFF4F7",
        text: "#C84B31",
        border: "rgba(200, 75, 49, 0.3)",
        label: "Rejected",
      };
    case "pending":
    default:
      return {
        bg: "#FEF9EC",
        text: "#854D0E",
        border: "rgba(133, 77, 14, 0.25)",
        label: "Pending Approval",
      };
  }
}

function bookingStatusStyle(status: BookingStatus): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case "Accepted":
      return {
        bg: "#E3F6F5",
        text: "#0F514C",
        border: "rgba(15, 81, 76, 0.25)",
      };
    case "Rejected":
    case "Cancelled":
      return {
        bg: "#FFF4F7",
        text: "#C84B31",
        border: "rgba(200, 75, 49, 0.3)",
      };
    case "Pending":
    default:
      return {
        bg: "#FEF9EC",
        text: "#854D0E",
        border: "rgba(133, 77, 14, 0.25)",
      };
  }
}

function VendorDashboardLoading() {
  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="flex min-h-screen items-center justify-center pt-20"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-[#24020E]/75">
        <Loader2 className="h-4 w-4 animate-spin text-teal-800" />
        <span>Loading vendor dashboard...</span>
      </div>
    </div>
  );
}

function VendorDashboardContent() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<VendorTab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [user, setUser] = useState<VendorUser | null>(null);
  const [services, setServices] = useState<VendorService[]>([]);
  const [bookings, setBookings] = useState<VendorBookingRequest[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [serviceForm, setServiceForm] = useState({
    serviceName: "",
    category: SERVICE_CATEGORIES[0],
    description: "",
    price: "",
    location: "",
    imageUrl: "",
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingService, setSubmittingService] = useState(false);

  const [viewingService, setViewingService] = useState<VendorService | null>(
    null
  );
  const [editingService, setEditingService] = useState<VendorService | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    serviceName: "",
    category: "",
    description: "",
    price: "",
    location: "",
    imageUrl: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<VendorService | null>(
    null
  );
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(
    null
  );
  const [togglingServiceId, setTogglingServiceId] = useState<string | null>(
    null
  );

  const [processingBookingId, setProcessingBookingId] = useState<string | null>(
    null
  );
  const [upgradingPlan, setUpgradingPlan] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        cache: "no-store",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const fresh = data?.user || data?.data;
        if (fresh) {
          window.localStorage.setItem("wedplan_user", JSON.stringify(fresh));
          setUser(fresh);
        }
      }
    } catch {
      // Keep cached session on transient error
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setUser(readStoredUser());
    void refreshCurrentUser();
  }, [mounted, refreshCurrentUser]);

  const fetchVendorData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setServices([]);
      setBookings([]);
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      const [srvRes, bkRes] = await Promise.all([
        fetch(`${API_BASE}/api/services/vendor/mine`, {
          cache: "no-store",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE}/api/bookings/vendor`, {
          cache: "no-store",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (srvRes.ok) {
        const srvData = await srvRes.json().catch(() => null);
        setServices(Array.isArray(srvData?.data) ? srvData.data : []);
      }

      if (bkRes.ok) {
        const bkData = await bkRes.json().catch(() => null);
        setBookings(Array.isArray(bkData?.data) ? bkData.data : []);
      }
    } catch {
      // Keep existing state on error
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void fetchVendorData();
  }, [mounted, fetchVendorData]);

  const currentPlan: "free" | "premium" =
    user?.subscriptionPlan === "premium" ? "premium" : "free";

  const stats = useMemo(() => {
    const totalServices = services.length;
    const activeServices = services.filter((s) => s.isActive).length;
    const pendingBookings = bookings.filter(
      (b) => b.status === "Pending"
    ).length;
    const acceptedBookings = bookings.filter(
      (b) => b.status === "Accepted"
    ).length;
    return {
      totalServices,
      activeServices,
      pendingBookings,
      acceptedBookings,
    };
  }, [services, bookings]);

  const reachedFreeLimit =
    currentPlan === "free" && stats.activeServices >= FREE_ACTIVE_LIMIT;

  const uploadToImgBB = async (file: File): Promise<string | null> => {
    if (!IMGBB_API_KEY) {
      toast.error(
        "No ImgBB API key found — paste a direct image URL instead, or add NEXT_PUBLIC_IMGBB_API_KEY to .env.local."
      );
      return null;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_API_KEY)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json().catch(() => null);
      const url = data?.data?.display_url || data?.data?.url;
      if (!res.ok || !data?.success || !url) {
        throw new Error(data?.error?.message || "Image upload failed");
      }

      toast.success("Service image uploaded!");
      return String(url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload image to ImgBB"
      );
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }
    const url = await uploadToImgBB(file);
    if (url) {
      setServiceForm((prev) => ({ ...prev, imageUrl: url }));
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reachedFreeLimit) {
      toast.error(
        "Free plan allows up to 3 active services. Upgrade to Premium for unlimited services."
      );
      return;
    }

    if (
      !serviceForm.serviceName.trim() ||
      !serviceForm.category.trim() ||
      !serviceForm.description.trim() ||
      !serviceForm.location.trim() ||
      serviceForm.price === ""
    ) {
      toast.error("Please fill in all required service fields.");
      return;
    }

    const numericPrice = Number(serviceForm.price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      toast.error("Please enter a valid non-negative price.");
      return;
    }

    const trimmedImageUrl = serviceForm.imageUrl.trim();
    if (!trimmedImageUrl) {
      toast.error("Please paste a service image URL or upload an image file.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Please sign in as a vendor to publish a service.");
      return;
    }

    try {
      setSubmittingService(true);
      const res = await fetch(`${API_BASE}/api/services`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: user?.id || user?._id,
          vendorName: user?.name,
          businessName: user?.businessName,
          serviceName: serviceForm.serviceName.trim(),
          category: serviceForm.category.trim(),
          description: serviceForm.description.trim(),
          price: numericPrice,
          location: serviceForm.location.trim(),
          images: [trimmedImageUrl],
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to submit service");
      }

      if (data?.data) {
        setServices((prev) => [data.data as VendorService, ...prev]);
      } else {
        await fetchVendorData();
      }

      setServiceForm({
        serviceName: "",
        category: SERVICE_CATEGORIES[0],
        description: "",
        price: "",
        location: "",
        imageUrl: "",
      });
      toast.success(
        "Service submitted! Status is Pending until approved by an admin."
      );
      setActiveTab("my-services");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not submit service"
      );
    } finally {
      setSubmittingService(false);
    }
  };

  const openEditModal = (srv: VendorService) => {
    setEditingService(srv);
    setEditForm({
      serviceName: srv.serviceName,
      category: srv.category || SERVICE_CATEGORIES[0],
      description: srv.description,
      price: String(srv.price),
      location: srv.location,
      imageUrl: srv.images?.[0] || "",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    const numericPrice = Number(editForm.price);
    if (
      !editForm.serviceName.trim() ||
      !editForm.category.trim() ||
      !editForm.description.trim() ||
      !editForm.location.trim() ||
      Number.isNaN(numericPrice) ||
      numericPrice < 0
    ) {
      toast.error("Please complete all service fields with a valid price.");
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      setSavingEdit(true);
      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(editingService._id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            serviceName: editForm.serviceName.trim(),
            category: editForm.category.trim(),
            description: editForm.description.trim(),
            price: numericPrice,
            location: editForm.location.trim(),
            images: editForm.imageUrl.trim()
              ? [editForm.imageUrl.trim()]
              : editingService.images,
          }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update service");
      }

      const updated = data?.data as VendorService | undefined;
      if (updated) {
        setServices((prev) =>
          prev.map((item) => (item._id === updated._id ? updated : item))
        );
      } else {
        await fetchVendorData();
      }

      toast.success("Service updated and sent for admin approval.");
      setEditingService(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update service"
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleAvailability = async (srv: VendorService) => {
    const nextActive = !srv.isActive;
    if (nextActive && reachedFreeLimit) {
      toast.error(
        "Free plan allows up to 3 active services. Upgrade to Premium to activate more."
      );
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      setTogglingServiceId(srv._id);
      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(srv._id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive: nextActive }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update availability");
      }

      setServices((prev) =>
        prev.map((item) =>
          item._id === srv._id ? { ...item, isActive: nextActive } : item
        )
      );
      toast.success(
        nextActive ? "Service marked as Active." : "Service marked as Inactive."
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not toggle availability"
      );
    } finally {
      setTogglingServiceId(null);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    const token = getToken();
    if (!token) return;

    try {
      setDeletingServiceId(serviceToDelete._id);
      const res = await fetch(
        `${API_BASE}/api/services/${encodeURIComponent(serviceToDelete._id)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to delete service");
      }

      setServices((prev) =>
        prev.filter((item) => item._id !== serviceToDelete._id)
      );
      toast.success("Service deleted.");
      setServiceToDelete(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete service"
      );
    } finally {
      setDeletingServiceId(null);
    }
  };

  const handleBookingDecision = async (
    booking: VendorBookingRequest,
    decision: "Accepted" | "Rejected"
  ) => {
    if (booking.status !== "Pending") {
      toast.error(
        `This booking is already ${booking.status} and cannot be modified again.`
      );
      return;
    }

    const token = getToken();
    if (!token) return;

    try {
      setProcessingBookingId(booking._id);
      const res = await fetch(
        `${API_BASE}/api/bookings/${encodeURIComponent(booking._id)}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: decision }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Failed to update booking request");
      }

      setBookings((prev) =>
        prev.map((item) =>
          item._id === booking._id ? { ...item, status: decision } : item
        )
      );
      toast.success(`Booking request ${decision.toLowerCase()}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update booking status"
      );
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleUpgradeToPremium = async () => {
    if (currentPlan === "premium") {
      toast.success("You are already on the Premium plan.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Please sign in as a vendor first.");
      return;
    }

    try {
      setUpgradingPlan(true);
      const res = await fetch(
        `${API_BASE}/api/subscriptions/create-checkout-session`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ plan: "premium" }),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false || !data?.url) {
        throw new Error(data?.message || "Could not start Stripe checkout");
      }

      window.location.href = String(data.url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start Stripe checkout"
      );
      setUpgradingPlan(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("wedplan_token");
      window.localStorage.removeItem("wedplan_user");
      window.dispatchEvent(new Event("wedplan-auth-changed"));
    }
    setUser(null);
    toast.success("Signed out.");
    router.push("/sign-in");
  };

  const navItems: {
    id: VendorTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: "add-service",
      label: "Add Service",
      icon: <PlusCircle className="h-4 w-4" />,
    },
    {
      id: "my-services",
      label: "My Services",
      icon: <Package className="h-4 w-4" />,
      badge: stats.totalServices,
    },
    {
      id: "bookings",
      label: "Booking Requests",
      icon: <CalendarClock className="h-4 w-4" />,
      badge: stats.pendingBookings,
    },
    {
      id: "subscription",
      label: "Subscription",
      icon: <Crown className="h-4 w-4" />,
    },
  ];

  const displayBusiness = user?.businessName || user?.name || "Vendor Studio";

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip pt-20 pb-16 sm:pt-24"
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
              "radial-gradient(circle, rgba(254, 243, 199, 0.65) 0%, transparent 72%)",
          }}
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
        />
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(186, 238, 233, 0.55) 0%, transparent 72%)",
          }}
          className="absolute right-[-90px] bottom-10 h-[400px] w-[400px] rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/90 px-4 py-3 shadow-2xs backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-teal-800" />
            <span className="text-xs font-bold tracking-wider uppercase">
              Vendor Dashboard
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-white/85 px-3 py-1.5 text-xs font-semibold"
          >
            {sidebarOpen ? (
              <>
                <X className="h-4 w-4" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Menu className="h-4 w-4" />
                <span>Menu</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <aside
            className={`${
              sidebarOpen ? "block" : "hidden"
            } space-y-4 lg:sticky lg:top-24 lg:col-span-3 lg:block`}
          >
            <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-5 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-3 border-b border-[#24020E]/10 pb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={displayBusiness}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-teal-950">
                      {displayBusiness.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#24020E]">
                    {displayBusiness}
                  </p>
                  <p className="truncate text-[11px] text-[#24020E]/65">
                    {user?.email || "vendor@wedplan.app"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="inline-block rounded-full border border-teal-800/25 bg-[#E3F6F5] px-2 py-0.5 text-[9px] font-bold tracking-wider text-teal-950 uppercase">
                      VENDOR
                    </span>
                    {currentPlan === "premium" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-700/30 bg-amber-100/90 px-2 py-0.5 text-[9px] font-bold tracking-wider text-amber-900 uppercase">
                        <Crown className="h-2.5 w-2.5" />
                        <span>PRO</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <nav
                aria-label="Vendor Dashboard Navigation"
                className="mt-4 space-y-1.5"
              >
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wider uppercase transition ${
                        active
                          ? "bg-[#24020E] text-[#FCF9F4] shadow-xs"
                          : "text-[#24020E]/80 hover:bg-[#E3F6F5]/75 hover:text-[#24020E]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-[#99F6E4] text-[#24020E]"
                              : "bg-[#E3F6F5] text-teal-950"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-5 space-y-1.5 border-t border-[#24020E]/10 pt-4">
                <Link
                  href="/browse-services"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#24020E]/80 transition hover:bg-white/80"
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                  <span>Marketplace View</span>
                </Link>
                <Link
                  href="/"
                  className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#24020E]/80 transition hover:bg-white/80"
                >
                  <Home className="h-3.5 w-3.5 text-teal-700" />
                  <span>Home</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#C84B31]/20 bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-6 lg:col-span-9">
            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#24020E]/15 bg-gradient-to-r from-white/85 via-[#E3F6F5]/65 to-[#FFF4F7]/80 p-6 shadow-sm backdrop-blur-md sm:flex-row sm:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-widest text-teal-950 uppercase">
                    <Store className="h-3 w-3 text-teal-700" />
                    <span>Vendor Dashboard</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#24020E]/15 bg-white/85 px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                    <Crown className="h-3 w-3 text-amber-700" />
                    <span>
                      {currentPlan === "premium" ? "Premium Plan" : "Free Plan"}
                    </span>
                  </span>
                </div>
                <h1
                  style={{ fontFamily: "var(--font-curly), cursive" }}
                  className="mt-2 text-3xl text-[#24020E] sm:text-4xl"
                >
                  {activeTab === "overview" && "Vendor Studio Overview"}
                  {activeTab === "add-service" && "Add New Wedding Service"}
                  {activeTab === "my-services" && "My Wedding Services"}
                  {activeTab === "bookings" && "Customer Booking Requests"}
                  {activeTab === "subscription" && "Vendor Subscription Plans"}
                </h1>
                <p className="mt-0.5 text-xs text-[#24020E]/70">
                  Manage your service listings, admin approval status, booking
                  requests, and plan limits.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("add-service")}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] px-4 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-xs transition hover:bg-teal-800"
              >
                <PlusCircle className="h-3.5 w-3.5 text-[#99F6E4]" />
                <span>Add Service</span>
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Total Services
                      </span>
                      <Layers className="h-4 w-4 text-[#24020E]" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-[#24020E]">
                      {mounted ? stats.totalServices : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]/80 p-4 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-teal-950/75 uppercase">
                        Active Services
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-teal-700" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-teal-900">
                      {mounted ? stats.activeServices : 0}
                      {currentPlan === "free" ? ` / ${FREE_ACTIVE_LIMIT}` : ""}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Pending Requests
                      </span>
                      <Hourglass className="h-4 w-4 text-amber-700" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-800">
                      {mounted ? stats.pendingBookings : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#E3F6F5]/80 p-4 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-teal-950/75 uppercase">
                        Accepted Bookings
                      </span>
                      <CheckCircle2 className="h-4 w-4 text-teal-700" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-teal-900">
                      {mounted ? stats.acceptedBookings : 0}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-[#FFF4F7]/85 p-4 shadow-2xs backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-wider text-[#24020E]/65 uppercase">
                        Current Plan
                      </span>
                      <Crown className="h-4 w-4 text-amber-700" />
                    </div>
                    <p className="mt-2 text-xl font-bold text-[#24020E] uppercase">
                      {mounted ? currentPlan : "free"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-[#24020E]/15 bg-white/75 p-5 shadow-sm backdrop-blur-md">
                    <div className="mb-3 flex items-center justify-between border-b border-[#24020E]/10 pb-2.5">
                      <h2 className="text-xs font-bold tracking-widest text-[#24020E] uppercase">
                        Submitted Services & Approval
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("my-services")}
                        className="cursor-pointer text-xs font-semibold text-teal-800 hover:underline"
                      >
                        Manage →
                      </button>
                    </div>
                    <div className="max-h-[280px] divide-y divide-[#24020E]/10 overflow-y-auto pr-1">
                      {services.length === 0 ? (
                        <p className="py-8 text-center text-xs text-[#24020E]/65">
                          No services submitted yet.
                        </p>
                      ) : (
                        services.map((srv) => {
                          const badge = approvalBadgeStyle(srv.status);
                          return (
                            <div
                              key={srv._id}
                              className="flex items-center justify-between gap-2 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[#24020E]">
                                  {srv.serviceName}
                                </p>
                                <p className="text-[11px] text-[#24020E]/65">
                                  ৳{Number(srv.price).toLocaleString("en-BD")} •{" "}
                                  {srv.isActive ? "Active" : "Inactive"}
                                </p>
                              </div>
                              <span
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  borderColor: badge.border,
                                }}
                                className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase"
                              >
                                {badge.label}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#24020E]/15 bg-white/75 p-5 shadow-sm backdrop-blur-md">
                    <div className="mb-3 flex items-center justify-between border-b border-[#24020E]/10 pb-2.5">
                      <h2 className="text-xs font-bold tracking-widest text-[#24020E] uppercase">
                        Recent Booking Requests
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("bookings")}
                        className="cursor-pointer text-xs font-semibold text-teal-800 hover:underline"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="max-h-[280px] divide-y divide-[#24020E]/10 overflow-y-auto pr-1">
                      {bookings.length === 0 ? (
                        <p className="py-8 text-center text-xs text-[#24020E]/65">
                          No booking requests yet.
                        </p>
                      ) : (
                        bookings.map((bk) => {
                          const bBadge = bookingStatusStyle(bk.status);
                          return (
                            <div
                              key={bk._id}
                              className="flex items-center justify-between gap-2 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-[#24020E]">
                                  {bk.serviceName}
                                </p>
                                <p className="text-[11px] text-[#24020E]/65">
                                  {bk.customerName} • {formatDate(bk.eventDate)}
                                </p>
                              </div>
                              <span
                                style={{
                                  backgroundColor: bBadge.bg,
                                  color: bBadge.text,
                                  borderColor: bBadge.border,
                                }}
                                className="shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase"
                              >
                                {bk.status}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "add-service" && (
              <div className="rounded-2xl border border-[#24020E]/15 bg-white/80 p-6 shadow-sm backdrop-blur-md">
                {reachedFreeLimit && (
                  <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-amber-700/30 bg-[#FEF9EC] p-4 text-xs text-amber-950 sm:flex-row sm:items-center">
                    <span>
                      <strong>Free Plan Limit Reached:</strong> You already have{" "}
                      {FREE_ACTIVE_LIMIT} active services. Upgrade to Premium to
                      publish unlimited services.
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("subscription")}
                      className="shrink-0 cursor-pointer rounded-xl bg-[#24020E] px-3.5 py-2 text-[11px] font-semibold text-[#FCF9F4]"
                    >
                      Upgrade to Premium
                    </button>
                  </div>
                )}

                <form
                  noValidate
                  onSubmit={handleCreateService}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Service Name *
                      </label>
                      <input
                        type="text"
                        value={serviceForm.serviceName}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            serviceName: e.target.value,
                          })
                        }
                        placeholder="e.g., Royal Bridal Cinematography"
                        className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Service Category *
                      </label>
                      <select
                        value={serviceForm.category}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            category: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:bg-white"
                      >
                        {SERVICE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Price (BDT / ৳) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.price}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            price: e.target.value,
                          })
                        }
                        placeholder="25000"
                        className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                        Location *
                      </label>
                      <input
                        type="text"
                        value={serviceForm.location}
                        onChange={(e) =>
                          setServiceForm({
                            ...serviceForm,
                            location: e.target.value,
                          })
                        }
                        placeholder="e.g., Rajshahi / Dhaka"
                        className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                      Description *
                    </label>
                    <textarea
                      rows={3}
                      value={serviceForm.description}
                      onChange={(e) =>
                        setServiceForm({
                          ...serviceForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe deliverables, packages, and coverage..."
                      className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/80 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-700 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold tracking-wider uppercase">
                      Service Image (Direct URL or ImgBB File Upload) *
                    </label>
                    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#24020E]/25 bg-[#FFF4F7]/65 p-4 sm:flex-row sm:items-center">
                      <img
                        src={serviceForm.imageUrl.trim() || FALLBACK_IMAGE}
                        alt="Service preview"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                        className="h-20 w-28 shrink-0 rounded-xl border border-[#24020E]/15 object-cover"
                      />

                      <div className="w-full space-y-2.5">
                        <input
                          type="url"
                          value={serviceForm.imageUrl}
                          onChange={(e) =>
                            setServiceForm({
                              ...serviceForm,
                              imageUrl: e.target.value,
                            })
                          }
                          placeholder="Paste direct image URL (https://...)"
                          className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3.5 py-2 text-xs outline-none transition focus:border-teal-700"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-[#24020E]/65">
                            <p>
                              {uploadingImage
                                ? "Uploading to ImgBB..."
                                : IMGBB_API_KEY
                                  ? "Paste a link above or upload a file via ImgBB"
                                  : "No ImgBB key configured — paste a direct image URL above"}
                            </p>
                            <p className="text-[10px] text-[#24020E]/55">
                              Submitted services start as <strong>Pending</strong>{" "}
                              until approved by an admin.
                            </p>
                          </div>

                          <label
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#24020E]/15 bg-white px-4 py-2 text-xs font-semibold text-[#24020E] transition ${
                              uploadingImage || !IMGBB_API_KEY
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer hover:bg-[#E3F6F5]"
                            }`}
                          >
                            {uploadingImage ? (
                              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                            ) : (
                              <Upload className="h-4 w-4 text-teal-800" />
                            )}
                            <span>
                              {uploadingImage ? "Uploading..." : "Upload File"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingImage || !IMGBB_API_KEY}
                              onChange={(e) => void handleFileChange(e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={
                        submittingService || uploadingImage || reachedFreeLimit
                      }
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] px-6 py-3 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-sm transition hover:bg-teal-800 disabled:opacity-50"
                    >
                      {submittingService ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlusCircle className="h-4 w-4 text-[#99F6E4]" />
                      )}
                      <span>
                        {submittingService
                          ? "Submitting..."
                          : "Submit for Admin Approval"}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "my-services" && (
              <div className="space-y-4 rounded-2xl border border-[#24020E]/15 bg-white/70 p-5 shadow-sm backdrop-blur-md">
                {loadingData ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-xs text-[#24020E]/70">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                    <span>Loading your services...</span>
                  </div>
                ) : services.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/75 p-10 text-center">
                    <p className="text-sm font-semibold text-[#24020E]/75">
                      You haven&apos;t added any services yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("add-service")}
                      className="mt-3 cursor-pointer rounded-xl bg-[#24020E] px-4 py-2 text-xs font-semibold text-[#FCF9F4]"
                    >
                      Add Your First Service
                    </button>
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-3.5 overflow-y-auto pr-1">
                    {services.map((srv) => {
                      const badge = approvalBadgeStyle(srv.status);
                      return (
                        <div
                          key={srv._id}
                          className="flex flex-col gap-4 rounded-2xl border border-[#24020E]/15 bg-white/85 p-4 shadow-2xs sm:flex-row sm:items-center"
                        >
                          <img
                            src={srv.images?.[0] || FALLBACK_IMAGE}
                            alt={srv.serviceName}
                            className="h-24 w-full shrink-0 rounded-xl border border-[#24020E]/10 object-cover sm:h-24 sm:w-32"
                          />

                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                style={{ fontFamily: "var(--font-curly), cursive" }}
                                className="text-2xl text-[#24020E]"
                              >
                                {srv.serviceName}
                              </h3>
                              <span
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.text,
                                  borderColor: badge.border,
                                }}
                                className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase"
                              >
                                {badge.label}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                                  srv.isActive
                                    ? "bg-[#E3F6F5] text-teal-950"
                                    : "bg-[#FFF4F7] text-[#C84B31]"
                                }`}
                              >
                                {srv.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#24020E]/75">
                              <span>
                                <strong>Category:</strong> {srv.category}
                              </span>
                              <span>
                                <strong>Price:</strong> ৳
                                {Number(srv.price).toLocaleString("en-BD")}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-teal-700" />
                                {srv.location}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                            <button
                              type="button"
                              onClick={() => setViewingService(srv)}
                              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7] px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[#E3F6F5]"
                            >
                              <Eye className="h-3.5 w-3.5 text-teal-800" />
                              <span>Details</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openEditModal(srv)}
                              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#24020E]/15 bg-white px-3 py-1.5 text-[11px] font-semibold transition hover:bg-[#E3F6F5]"
                            >
                              <Pencil className="h-3.5 w-3.5 text-[#24020E]" />
                              <span>Update</span>
                            </button>

                            <button
                              type="button"
                              disabled={togglingServiceId === srv._id}
                              onClick={() => void handleToggleAvailability(srv)}
                              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-teal-800/25 bg-[#E3F6F5]/75 px-3 py-1.5 text-[11px] font-semibold text-teal-950 transition hover:bg-[#E3F6F5]"
                            >
                              <span>
                                {srv.isActive ? "Set Inactive" : "Set Active"}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setServiceToDelete(srv)}
                              className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#C84B31]/30 bg-[#FFF4F7] px-3 py-1.5 text-[11px] font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookings" && (
              <div className="space-y-4 rounded-2xl border border-[#24020E]/15 bg-white/70 p-5 shadow-sm backdrop-blur-md">
                {loadingData ? (
                  <div className="flex items-center justify-center gap-2 py-14 text-xs text-[#24020E]/70">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                    <span>Loading booking requests...</span>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/75 p-10 text-center">
                    <p className="text-sm font-semibold text-[#24020E]/75">
                      No booking requests received yet.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[480px] space-y-3.5 overflow-y-auto pr-1">
                    {bookings.map((bk) => {
                      const bBadge = bookingStatusStyle(bk.status);
                      const isPending = bk.status === "Pending";
                      const customerLocation =
                        bk.customerLocation || bk.location || "";

                      return (
                        <div
                          key={bk._id}
                          className="flex flex-col justify-between gap-4 rounded-2xl border border-[#24020E]/15 bg-white/85 p-4 shadow-2xs sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-bold text-[#24020E]">
                                {bk.serviceName}
                              </h3>
                              <span
                                style={{
                                  backgroundColor: bBadge.bg,
                                  color: bBadge.text,
                                  borderColor: bBadge.border,
                                }}
                                className="rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase"
                              >
                                {bk.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-[#24020E]/10 bg-[#FFF4F7]/55 px-3 py-2 text-xs text-[#24020E]/80">
                              <span className="text-[10px] font-bold tracking-wider text-teal-900 uppercase">
                                Customer Info:
                              </span>
                              <span className="inline-flex items-center gap-1 font-semibold">
                                <User className="h-3.5 w-3.5 text-[#C84B31]" />
                                {bk.customerName}
                              </span>
                              {bk.customerEmail && (
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5 text-teal-700" />
                                  {bk.customerEmail}
                                </span>
                              )}
                              {customerLocation && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5 text-[#C84B31]" />
                                  <span>
                                    Customer Location:{" "}
                                    <strong>{customerLocation}</strong>
                                  </span>
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#24020E]/75">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-teal-700" />
                                Event Date:{" "}
                                <strong>{formatDate(bk.eventDate)}</strong>
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-teal-700" />
                                Event Location:{" "}
                                <strong>{bk.eventLocation}</strong>
                              </span>
                            </div>

                            {bk.message && (
                              <p className="rounded-xl border border-[#24020E]/10 bg-[#FFF4F7]/75 px-3 py-2 text-xs text-[#24020E]/80">
                                &ldquo;{bk.message}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 gap-2 sm:flex-col">
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  disabled={processingBookingId === bk._id}
                                  onClick={() =>
                                    void handleBookingDecision(bk, "Accepted")
                                  }
                                  className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-teal-800 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-teal-900 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Accept</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={processingBookingId === bk._id}
                                  onClick={() =>
                                    void handleBookingDecision(bk, "Rejected")
                                  }
                                  className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-[#C84B31]/30 bg-[#FFF4F7] px-3.5 py-2 text-[11px] font-semibold text-[#C84B31] transition hover:bg-[#C84B31] hover:text-white disabled:opacity-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            ) : (
                              <span className="rounded-xl border border-[#24020E]/10 bg-[#FCF9F4] px-3 py-1.5 text-center text-[10px] font-bold tracking-wider text-[#24020E]/60 uppercase">
                                Finalized
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "subscription" && (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col justify-between rounded-2xl border border-[#24020E]/15 bg-white/80 p-6 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-[#24020E]">
                        Free Plan
                      </h2>
                      <span className="rounded-full bg-[#FCF9F4] px-3 py-0.5 text-[10px] font-bold tracking-wider text-[#24020E]/70 uppercase">
                        ৳0 / mo
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-xs text-[#24020E]/80">
                      <li>• Maximum {FREE_ACTIVE_LIMIT} Active Services</li>
                      <li>• Basic Vendor Dashboard</li>
                      <li>• Booking Request Management</li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    {currentPlan === "free" ? (
                      <span className="inline-block rounded-xl border border-[#24020E]/15 bg-[#E3F6F5] px-4 py-2 text-xs font-bold text-teal-950 uppercase">
                        Current Plan
                      </span>
                    ) : (
                      <span className="inline-block text-xs text-[#24020E]/60">
                        Included in your account
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-amber-700/30 bg-gradient-to-br from-[#FEF9EC] via-white to-[#FFF4F7] p-6 shadow-sm">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-lg font-bold text-[#24020E]">
                        <Crown className="h-5 w-5 text-amber-700" />
                        <span>Premium Plan</span>
                      </span>
                      <span className="rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-bold tracking-wider text-amber-900 uppercase">
                        ৳1,999 / mo
                      </span>
                    </div>
                    <ul className="mt-4 space-y-2 text-xs text-[#24020E]/85">
                      <li>• Unlimited Active Services</li>
                      <li>• Premium Vendor Badge</li>
                      <li>• All Free Plan Features</li>
                    </ul>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-[#24020E]/65">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-800" />
                      <span>Secured via Stripe Checkout</span>
                    </p>
                  </div>

                  <div className="mt-6">
                    {currentPlan === "premium" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-700 px-4 py-2 text-xs font-bold text-white uppercase">
                        <Crown className="h-3.5 w-3.5" />
                        <span>Active Premium Plan</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={upgradingPlan}
                        onClick={() => void handleUpgradeToPremium()}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#24020E] px-5 py-2.5 text-xs font-semibold tracking-wider text-[#FCF9F4] uppercase shadow-xs transition hover:bg-teal-800 disabled:opacity-50"
                      >
                        {upgradingPlan ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crown className="h-4 w-4 text-amber-300" />
                        )}
                        <span>
                          {upgradingPlan
                            ? "Redirecting to Stripe..."
                            : "Pay with Stripe"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {viewingService && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingService(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4]/95 p-6 shadow-xl"
            >
              <div className="flex items-start justify-between gap-3 border-b border-[#24020E]/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase">
                    Service Details
                  </span>
                  <h2
                    style={{ fontFamily: "var(--font-curly), cursive" }}
                    className="text-2xl text-[#24020E]"
                  >
                    {viewingService.serviceName}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingService(null)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#24020E]/15 bg-[#FFF4F7]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <img
                src={viewingService.images?.[0] || FALLBACK_IMAGE}
                alt={viewingService.serviceName}
                className="h-44 w-full rounded-xl border border-[#24020E]/10 object-cover"
              />

              <div className="space-y-1.5 text-xs">
                <p>
                  <strong>Category:</strong> {viewingService.category}
                </p>
                <p>
                  <strong>Price:</strong> ৳
                  {Number(viewingService.price).toLocaleString("en-BD")}
                </p>
                <p>
                  <strong>Location:</strong> {viewingService.location}
                </p>
                <p>
                  <strong>Approval Status:</strong>{" "}
                  {approvalBadgeStyle(viewingService.status).label}
                </p>
                <p>
                  <strong>Availability:</strong>{" "}
                  {viewingService.isActive ? "Active" : "Inactive"}
                </p>
                <p className="pt-1 leading-relaxed text-[#24020E]/80">
                  {viewingService.description}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingService && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !savingEdit && setEditingService(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/40 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[88vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[#24020E]/20 bg-[#FCF9F4] p-6 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#24020E]/10 pb-3">
                <h2 className="text-base font-bold text-[#24020E]">
                  Update Service
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#24020E]/15 bg-[#FFF4F7]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
                <div>
                  <label className="mb-1 block font-bold uppercase">
                    Service Name
                  </label>
                  <input
                    type="text"
                    value={editForm.serviceName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, serviceName: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block font-bold uppercase">
                      Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) =>
                        setEditForm({ ...editForm, category: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-700"
                    >
                      {editForm.category &&
                        !SERVICE_CATEGORIES.includes(editForm.category) && (
                          <option value={editForm.category}>
                            {editForm.category}
                          </option>
                        )}
                      {SERVICE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-bold uppercase">
                      Price (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.price}
                      onChange={(e) =>
                        setEditForm({ ...editForm, price: e.target.value })
                      }
                      className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-bold uppercase">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) =>
                      setEditForm({ ...editForm, location: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold uppercase">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={editForm.imageUrl}
                    onChange={(e) =>
                      setEditForm({ ...editForm, imageUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold uppercase">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    className="w-full rounded-xl border border-[#24020E]/15 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#24020E] px-4 py-2 font-semibold text-[#FCF9F4]"
                  >
                    {savingEdit && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    <span>{savingEdit ? "Saving..." : "Save & Resubmit"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {serviceToDelete && (
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deletingServiceId && setServiceToDelete(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#24020E]/45 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm space-y-4 rounded-2xl border border-[#C84B31]/30 bg-[#FCF9F4] p-6 shadow-xl"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#C84B31]/25 bg-[#FFF4F7] text-[#C84B31]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#24020E]">
                    Delete Service?
                  </h3>
                  <p className="mt-1 text-xs text-[#24020E]/75">
                    Remove <strong>{serviceToDelete.serviceName}</strong>? This
                    cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setServiceToDelete(null)}
                  className="cursor-pointer rounded-xl border border-[#24020E]/15 bg-white px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingServiceId)}
                  onClick={() => void handleConfirmDeleteService()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#C84B31] px-4 py-2 text-xs font-semibold text-white"
                >
                  {deletingServiceId && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <span>{deletingServiceId ? "Deleting..." : "Delete"}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VendorDashboardPage() {
  return (
    <Suspense fallback={<VendorDashboardLoading />}>
      <VendorDashboardContent />
    </Suspense>
  );
}
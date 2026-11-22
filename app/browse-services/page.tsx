"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  SlidersHorizontal,
  MapPin,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import ServiceCard, { type WeddingService } from "../components/ServiceCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type SortOption = "newest" | "price-asc" | "price-desc";

const CATEGORY_OPTIONS = [
  "All",
  "Photography & Videography",
  "Photography & Cinematography",
  "Wedding Venues",
  "Decoration & Florist",
  "Stage & Venue Decor",
  "Catering Services",
  "Catering & Desserts",
  "Makeup & Styling",
  "Bridal Makeup & Styling",
  "Wedding Fashion",
  "Bridal Wear & Attire",
  "Mehndi & Henna",
  "Wedding Planner & Event",
  "DJ & Entertainment",
];

function checkIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.localStorage.getItem("wedplan_token"));
}

export default function BrowseServicesPage() {
  const [services, setServices] = useState<WeddingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [locationFilter, setLocationFilter] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  useEffect(() => {
    setIsAuthenticated(checkIsAuthenticated());

    const syncAuth = () => setIsAuthenticated(checkIsAuthenticated());
    window.addEventListener("storage", syncAuth);
    window.addEventListener("wedplan-auth-changed", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("wedplan-auth-changed", syncAuth);
    };
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/services`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      const list: (WeddingService & {
        isActive?: boolean;
        createdAt?: string;
      })[] = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.services)
          ? data.services
          : [];

      const approvedActive = list.filter(
        (srv) =>
          String(srv.status || "").toLowerCase() === "approved" &&
          srv.isActive !== false
      );
      setServices(approvedActive);
    } catch {
      toast.error("Could not load wedding services.");
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const availableCategories = useMemo(() => {
    const dynamic = services
      .map((s) => String(s.category || "").trim())
      .filter(Boolean);
    return Array.from(new Set([...CATEGORY_OPTIONS, ...dynamic]));
  }, [services]);

  const filteredAndSortedServices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const loc = locationFilter.trim().toLowerCase();
    const parsedMin = minPrice.trim() === "" ? null : Number(minPrice);
    const parsedMax = maxPrice.trim() === "" ? null : Number(maxPrice);

    const filtered = services.filter((srv) => {
      if (q) {
        const nameMatch = String(srv.serviceName || "")
          .toLowerCase()
          .includes(q);
        const categoryMatch = String(srv.category || "")
          .toLowerCase()
          .includes(q);
        const vendorMatch = [srv.businessName, srv.vendorName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (!nameMatch && !categoryMatch && !vendorMatch) return false;
      }

      if (selectedCategory !== "All") {
        if (
          String(srv.category || "").toLowerCase() !==
          selectedCategory.toLowerCase()
        ) {
          return false;
        }
      }

      if (loc) {
        if (!String(srv.location || "").toLowerCase().includes(loc)) {
          return false;
        }
      }

      const numericPrice = Number(srv.price ?? 0);
      if (
        parsedMin !== null &&
        !Number.isNaN(parsedMin) &&
        numericPrice < parsedMin
      ) {
        return false;
      }
      if (
        parsedMax !== null &&
        !Number.isNaN(parsedMax) &&
        numericPrice > parsedMax
      ) {
        return false;
      }

      return true;
    });

    const sorted = [...filtered];
    if (sortBy === "price-asc") {
      sorted.sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));
    } else if (sortBy === "price-desc") {
      sorted.sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0));
    } else {
      sorted.sort((a, b) => {
        const itemA = a as WeddingService & { createdAt?: string };
        const itemB = b as WeddingService & { createdAt?: string };
        const ta = itemA.createdAt ? new Date(itemA.createdAt).getTime() : 0;
        const tb = itemB.createdAt ? new Date(itemB.createdAt).getTime() : 0;
        return tb - ta;
      });
    }

    return sorted;
  }, [
    services,
    searchQuery,
    selectedCategory,
    locationFilter,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All" ||
    locationFilter.trim() !== "" ||
    minPrice.trim() !== "" ||
    maxPrice.trim() !== "" ||
    sortBy !== "newest";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setLocationFilter("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  };

  return (
    <div
      style={{ backgroundColor: "#FCF9F4", color: "#24020E" }}
      className="relative min-h-screen overflow-x-clip pt-20 pb-16 sm:pt-24"
    >
      {/* Background Grid & Warm Accents */}
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
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#24020E]/15 bg-gradient-to-r from-white/85 via-[#E3F6F5]/65 to-[#FFF4F7]/80 p-6 shadow-sm backdrop-blur-md sm:flex-row sm:items-center"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-800/25 bg-[#E3F6F5] px-3 py-0.5 text-[10px] font-bold tracking-widest text-teal-950 uppercase">
              <Sparkles className="h-3 w-3 text-teal-700" />
              <span>Curated Wedding Marketplace</span>
            </span>
            <h1
              style={{ fontFamily: "var(--font-curly), cursive" }}
              className="mt-2 text-3xl text-[#24020E] sm:text-4xl"
            >
              Browse Wedding Services
            </h1>
            <p className="mt-1 text-xs text-[#24020E]/75">
              Search by service name, filter by category, location, or min/max
              price, and sort by budget.
            </p>
          </div>

          <Link
            href="/"
            className="self-start rounded-xl border border-[#24020E]/15 bg-white/85 px-4 py-2 text-xs font-semibold text-[#24020E] transition hover:bg-[#E3F6F5] sm:self-center"
          >
            Back to Home
          </Link>
        </motion.div>

        {/* Filter & Sort Controls */}
        <div className="mb-8 space-y-4 rounded-2xl border border-[#24020E]/15 bg-white/85 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 border-b border-[#24020E]/10 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-teal-800" />
              <span className="text-xs font-bold tracking-wider text-[#24020E] uppercase">
                Search & Filter Services
              </span>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#24020E]/15 bg-[#FFF4F7] px-3 py-1 text-[11px] font-semibold text-[#24020E] transition hover:bg-[#E3F6F5]"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search by Name */}
            <div className="lg:col-span-2">
              <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                Service Name
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#24020E]/45" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by service name..."
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 py-2 pr-3 pl-9 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 px-3 py-2 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                Location
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-teal-700" />
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="e.g., Dhaka, Rajshahi"
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 py-2 pr-3 pl-8 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Min & Max Price */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                  Min Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 px-2.5 py-2 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                  Max Price (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 px-2.5 py-2 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-wider uppercase">
                Sort By
              </label>
              <div className="relative">
                <ArrowUpDown className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#24020E]/50" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full rounded-xl border border-[#24020E]/15 bg-[#FFF4F7]/75 py-2 pr-3 pl-8 text-xs outline-none transition focus:border-teal-700 focus:bg-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#24020E]/70">
            Showing{" "}
            <strong className="text-[#24020E]">
              {loading ? "—" : filteredAndSortedServices.length}
            </strong>{" "}
            approved &amp; active{" "}
            {filteredAndSortedServices.length === 1 ? "service" : "services"}
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#24020E]/15 bg-white/75 py-20 text-xs text-[#24020E]/75 backdrop-blur-md">
            <Loader2 className="h-6 w-6 animate-spin text-teal-800" />
            <p className="font-semibold">Loading wedding services...</p>
          </div>
        ) : filteredAndSortedServices.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-[#24020E]/20 bg-[#FFF4F7]/80 p-12 text-center backdrop-blur-md">
            <p className="text-base font-bold text-[#24020E]">
              No matching wedding services found
            </p>
            <p className="mt-1 text-xs text-[#24020E]/70">
              Try adjusting your service name, category, location, or min/max
              price range.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#24020E] px-4 py-2 text-xs font-semibold text-[#FCF9F4] transition hover:bg-teal-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        ) : (
          /* ServiceCard Grid */
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedServices.map((srv, index) => (
              <ServiceCard
                key={srv._id}
                service={srv}
                index={index}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
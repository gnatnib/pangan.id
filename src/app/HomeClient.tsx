"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PriceCard, PriceCardSkeleton } from "@/components/PriceCard";
import { SortControls } from "@/components/SortControls";
import { IndonesiaMap } from "@/components/IndonesiaMap";
import { DateRangePicker } from "@/components/DateRangePicker";
import { AiChatPanel } from "@/components/AiChatPanel";
import { supabase } from "@/lib/supabase";
import type { CommoditySummary, TrendPoint, Province } from "@/lib/types";
import { formatDateLong, formatRupiah, formatPrice, calcPctDiff } from "@/lib/utils";

type MapPrice = {
  province_id: string;
  province_name: string;
  price: number;
};

type HomeData = {
  summaries: CommoditySummary[];
  latestDate: string;
  sparklines: Record<number, TrendPoint[]>;
};

export function HomeClient() {
  // ── Data fetching state ──────────────────────────────────────────────
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pihps/homepage-data");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan yang tidak diketahui";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived values ───────────────────────────────────────────────────
  const summaries = data?.summaries ?? [];
  const latestDate = data?.latestDate ?? new Date().toISOString().split("T")[0];
  const sparklines = data?.sparklines ?? {};

  const [sort, setSort] = useState("change-desc");
  const normalizeProvinceName = (value: string) =>
    value
      .toLowerCase()
      .replace(/aceh/g, "nanggroe aceh darussalam")
      .replace(/kep\./g, "kepulauan")
      .replace(/kep bangka belitung/g, "kepulauan bangka belitung")
      .replace(/di yogyakarta/g, "di yogyakarta")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // Map commodity selector
  const [mapCommodityId, setMapCommodityId] = useState<number | null>(null);
  // Date range for map & table only
  const [mapStart, setMapStart] = useState(latestDate);
  const [mapEnd, setMapEnd] = useState(latestDate);
  // Map data
  const [mapPrices, setMapPrices] = useState<MapPrice[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  const [activeMapPreset, setActiveMapPreset] = useState<number | null>(1);
  // Provinces lookup
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Sync mapCommodityId and map dates when data arrives
  useEffect(() => {
    if (data && summaries.length > 0 && mapCommodityId === null) {
      setMapCommodityId(summaries[0].commodity.id);
      setMapStart(data.latestDate);
      setMapEnd(data.latestDate);
    }
  }, [data, summaries, mapCommodityId]);

  // Fetch provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      const { data } = await supabase.from("provinces").select("*").order("name");
      setProvinces(data || []);
    };
    fetchProvinces();
  }, []);

  // Fetch map prices when commodity or date range changes
  useEffect(() => {
    if (!mapCommodityId) return;
    const fetchMapData = async () => {
      setLoadingMap(true);
      const commodity = summaries.find(
        (summary) => summary.commodity.id === mapCommodityId
      )?.commodity;
      if (!commodity) {
        setMapPrices([]);
        setLoadingMap(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/pihps/commodity-table?slug=${commodity.slug}&startDate=${mapStart}&endDate=${mapEnd}`,
          { cache: "no-store" }
        );

        const payload = (await response.json()) as {
          rows?: Array<{ provinceName: string; averagePrice: number }>;
        };

        if (!response.ok) {
          setMapPrices([]);
          return;
        }

        const results = (payload.rows || []).map((row) => {
          const province = provinces.find(
            (item) =>
              normalizeProvinceName(item.name) === normalizeProvinceName(row.provinceName)
          );

          return {
            province_id: province?.id || row.provinceName,
            province_name: province?.name || row.provinceName,
            price: row.averagePrice,
          };
        });

        setMapPrices(results);
      } finally {
        setLoadingMap(false);
      }
    };
    fetchMapData();
  }, [mapCommodityId, mapStart, mapEnd, provinces, summaries]);

  const sorted = useMemo(() => {
    const arr = [...summaries];
    switch (sort) {
      case "change-desc":
        return arr.sort((a, b) => b.priceChangePct - a.priceChangePct);
      case "change-asc":
        return arr.sort((a, b) => a.priceChangePct - b.priceChangePct);
      case "price-desc":
        return arr.sort((a, b) => b.avgPrice - a.avgPrice);
      case "price-asc":
        return arr.sort((a, b) => a.avgPrice - b.avgPrice);
      case "name-asc":
        return arr.sort((a, b) => a.commodity.name.localeCompare(b.commodity.name));
      default:
        return arr;
    }
  }, [summaries, sort]);

  const upCount = summaries.filter((s) => s.priceChange > 0).length;
  const downCount = summaries.filter((s) => s.priceChange < 0).length;
  const stableCount = summaries.filter((s) => s.priceChange === 0).length;

  const hasData = summaries.length > 0;

  const selectedCommodity = summaries.find((s) => s.commodity.id === mapCommodityId);
  const mapAvg = selectedCommodity?.avgPrice || 0;

  const handleMapPreset = (days: number) => {
    setActiveMapPreset(days);
    if (days === 1) {
      setMapStart(latestDate);
      setMapEnd(latestDate);
    } else {
      const start = new Date(latestDate + "T00:00:00");
      start.setDate(start.getDate() - days);
      setMapStart(start.toISOString().split("T")[0]);
      setMapEnd(latestDate);
    }
  };

  // ── Error state ──────────────────────────────────────────────────────
  if (error && !loading && !hasData) {
    return (
      <div className="container-page py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-warm-800 tracking-tight">
            Harga Pangan Indonesia Hari Ini
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="card p-8 sm:p-12 text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Gagal Memuat Data
          </h2>
          <p className="text-sm text-warm-500 mb-6 max-w-md mx-auto">
            Maaf, data harga pangan tidak dapat dimuat saat ini. Hal ini mungkin
            disebabkan oleh gangguan koneksi atau server sumber data sedang tidak
            tersedia.
          </p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-orange text-white text-sm font-medium shadow-sm hover:bg-orange-600 active:scale-[0.97] transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182"
              />
            </svg>
            Coba Lagi
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-warm-800 tracking-tight">
          Harga Pangan Indonesia Hari Ini
        </h1>
        <p className="text-warm-500 mt-1 text-sm">
          {loading ? (
            <span className="skeleton inline-block h-4 w-64" />
          ) : (
            <>
              {formatDateLong(latestDate)} · Rata-rata nasional · Pasar Tradisional
            </>
          )}
        </p>
      </motion.div>

      {/* Quick stats row */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-3">
              <div className="skeleton h-3 w-20 mb-3" />
              <div className="skeleton h-7 w-12 mb-2" />
              <div className="skeleton h-3 w-16" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <div className="card p-3">
            <p className="text-[10px] text-warm-400 uppercase tracking-wide">Komoditas</p>
            <p className="text-xl font-bold text-warm-800 mt-0.5">{summaries.length}</p>
            <p className="text-xs text-warm-500">dipantau</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <p className="text-[10px] text-warm-400 uppercase tracking-wide">Naik</p>
            </div>
            <p className="text-xl font-bold text-red-600 mt-0.5">{upCount}</p>
            <p className="text-xs text-warm-500">komoditas</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-[10px] text-warm-400 uppercase tracking-wide">Turun</p>
            </div>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{downCount}</p>
            <p className="text-xs text-warm-500">komoditas</p>
          </div>
          <div className="card p-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-warm-300" />
              <p className="text-[10px] text-warm-400 uppercase tracking-wide">Stabil</p>
            </div>
            <p className="text-xl font-bold text-warm-600 mt-0.5">{stableCount}</p>
            <p className="text-xs text-warm-500">komoditas</p>
          </div>
        </motion.div>
      ) : null}

      <AiChatPanel latestDate={latestDate} />

      {/* Sort controls */}
      {(hasData || loading) && (
        <div className="mb-5">
          <SortControls value={sort} onChange={setSort} />
        </div>
      )}

      {/* Commodity grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <PriceCardSkeleton key={i} />
          ))}
        </div>
      ) : hasData ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {sorted.map((summary, i) => (
            <PriceCard
              key={summary.commodity.id}
              summary={summary}
              index={i}
              sparkData={sparklines[summary.commodity.id]}
            />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center mb-8">
          <p className="text-lg text-warm-400 mb-2">📊</p>
          <p className="text-sm text-warm-500">Belum ada data harga tersedia.</p>
        </div>
      )}

      {/* === MAP + TABLE SECTION (below commodity cards) === */}
      {hasData && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="card p-4 sm:p-6 mb-6"
        >
          {/* Commodity selector + Period picker */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-sm font-semibold text-warm-700">
                Peta Harga per Provinsi
              </h2>
              <select
                value={mapCommodityId || ""}
                onChange={(e) => setMapCommodityId(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg border border-warm-200 text-sm text-warm-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
              >
                {summaries.map((s) => (
                  <option key={s.commodity.id} value={s.commodity.id}>
                    {s.commodity.icon} {s.commodity.name}
                  </option>
                ))}
              </select>
            </div>
            <DateRangePicker
              startDate={mapStart}
              endDate={mapEnd}
              onStartChange={(d) => {
                setMapStart(d);
                setActiveMapPreset(null);
              }}
              onEndChange={(d) => {
                setMapEnd(d);
                setActiveMapPreset(null);
              }}
              onPreset={handleMapPreset}
              activePreset={activeMapPreset}
            />
          </div>

          {/* Selected commodity avg price */}
          {selectedCommodity && mapAvg > 0 && (
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-bold text-warm-800 font-tabular">
                {formatRupiah(mapAvg)}
              </span>
              <span className="text-sm text-warm-400">rata-rata nasional</span>
            </div>
          )}

          {/* Map + Table grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Map (3/5 width on desktop) */}
            <div className="lg:col-span-3">
              {loadingMap ? (
                <div className="flex items-center justify-center h-64 text-warm-400 text-sm">
                  Memuat peta...
                </div>
              ) : (
                <IndonesiaMap
                  data={mapPrices.map((p) => ({
                    provinceId: p.province_id,
                    price: p.price,
                  }))}
                  commodityName={selectedCommodity?.commodity.name || ""}
                  unit={selectedCommodity?.commodity.unit || "Kg"}
                />
              )}
            </div>

            {/* Price table (2/5 width on desktop) */}
            <div className="lg:col-span-2 overflow-y-auto" style={{ maxHeight: "420px" }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-warm-200">
                    <th className="text-left px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">
                      Provinsi
                    </th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">
                      Harga
                    </th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">
                      vs Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mapPrices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-6 text-center text-warm-400 text-xs"
                      >
                        Belum ada data
                      </td>
                    </tr>
                  ) : (
                    mapPrices.map((p, i) => {
                      const vsAvg = mapAvg > 0 ? calcPctDiff(p.price, mapAvg) : 0;
                      return (
                        <tr
                          key={p.province_id}
                          className="border-b border-warm-50 hover:bg-warm-50 transition-colors"
                        >
                          <td className="px-2 py-1.5 text-warm-700 text-xs">
                            <Link
                              href={`/provinsi/${provinces.find((prov) => prov.id === p.province_id)?.slug || ""}`}
                              className="hover:text-brand-orange transition-colors"
                            >
                              {p.province_name}
                            </Link>
                            {i === 0 && (
                              <span className="ml-1 text-[9px] text-emerald-600 font-medium">
                                Termurah
                              </span>
                            )}
                            {i === mapPrices.length - 1 && mapPrices.length > 1 && (
                              <span className="ml-1 text-[9px] text-red-600 font-medium">
                                Termahal
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold font-tabular text-warm-800 text-xs">
                            Rp {formatPrice(p.price)}
                          </td>
                          <td
                            className={`px-2 py-1.5 text-right font-tabular text-xs font-medium ${
                              vsAvg > 2
                                ? "text-red-600"
                                : vsAvg < -2
                                  ? "text-emerald-600"
                                  : "text-warm-400"
                            }`}
                          >
                            {vsAvg > 0 ? "+" : ""}
                            {vsAvg.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Data freshness */}
      <p className="text-xs text-warm-400 text-center mt-8">
        {loading ? (
          <span className="skeleton inline-block h-3 w-72" />
        ) : (
          <>
            Data terakhir diperbarui: {formatDateLong(latestDate)} · Sumber: Bank Indonesia
            PIHPS
          </>
        )}
      </p>
    </div>
  );
}

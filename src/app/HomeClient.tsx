"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PriceCard } from "@/components/PriceCard";
import { SortControls } from "@/components/SortControls";
import { IndonesiaMap } from "@/components/IndonesiaMap";
import { DateRangePicker } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import type { CommoditySummary, TrendPoint, Province } from "@/lib/types";
import { formatDateLong, formatRupiah, formatPrice, getDaysAgo, calcPctDiff } from "@/lib/utils";

interface HomeClientProps {
  summaries: CommoditySummary[];
  latestDate: string;
  sparklines: Record<number, TrendPoint[]>;
}

export function HomeClient({ summaries, latestDate, sparklines }: HomeClientProps) {
  const [sort, setSort] = useState("change-desc");
  // Map commodity selector
  const [mapCommodityId, setMapCommodityId] = useState<number | null>(null);
  // Date range for map & table only
  const [mapStart, setMapStart] = useState(latestDate);
  const [mapEnd, setMapEnd] = useState(latestDate);
  // Map data
  const [mapPrices, setMapPrices] = useState<any[]>([]);
  const [loadingMap, setLoadingMap] = useState(false);
  // Provinces lookup
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Initialize map commodity to first commodity
  useEffect(() => {
    if (summaries.length > 0 && !mapCommodityId) {
      setMapCommodityId(summaries[0].commodity.id);
    }
  }, [summaries, mapCommodityId]);

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
      // Get avg price per province for the date range
      const { data } = await supabase
        .from("prices")
        .select("province_id, price, date")
        .eq("commodity_id", mapCommodityId)
        .eq("market_type", "traditional")
        .gte("date", mapStart)
        .lte("date", mapEnd)
        .gt("price", 0);

      if (data) {
        // Group by province, take average over the date range
        const byProv = new Map<string, number[]>();
        for (const p of data) {
          if (!byProv.has(p.province_id)) byProv.set(p.province_id, []);
          byProv.get(p.province_id)!.push(p.price);
        }
        const results = Array.from(byProv.entries()).map(([provId, prices]) => ({
          province_id: provId,
          province_name: provinces.find((p) => p.id === provId)?.name || provId,
          price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        })).sort((a, b) => a.price - b.price);
        setMapPrices(results);
      }
      setLoadingMap(false);
    };
    fetchMapData();
  }, [mapCommodityId, mapStart, mapEnd, provinces]);

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
  const mapAvg = mapPrices.length > 0
    ? mapPrices.reduce((a, b) => a + b.price, 0) / mapPrices.length
    : 0;

  const handleMapPreset = (days: number) => {
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
          {formatDateLong(latestDate)} · Rata-rata nasional · Pasar Tradisional
        </p>
      </motion.div>

      {/* Quick stats row */}
      {hasData && (
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
      )}

      {/* Sort controls */}
      {hasData && (
        <div className="mb-5">
          <SortControls value={sort} onChange={setSort} />
        </div>
      )}

      {/* Commodity grid WITH sparklines */}
      {hasData ? (
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
          <p className="text-sm text-warm-500">
            Belum ada data harga tersedia.
          </p>
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
              onStartChange={setMapStart}
              onEndChange={setMapEnd}
              onPreset={handleMapPreset}
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
                    <th className="text-left px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">Provinsi</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">Harga</th>
                    <th className="text-right px-2 py-2 text-xs font-medium text-warm-400 uppercase tracking-wide">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {mapPrices.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-warm-400 text-xs">
                        Belum ada data
                      </td>
                    </tr>
                  ) : (
                    mapPrices.map((p, i) => {
                      const vsAvg = mapAvg > 0 ? calcPctDiff(p.price, mapAvg) : 0;
                      return (
                        <tr key={p.province_id} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                          <td className="px-2 py-1.5 text-warm-700 text-xs">
                            <Link
                              href={`/provinsi/${provinces.find((prov) => prov.id === p.province_id)?.slug || ""}`}
                              className="hover:text-brand-orange transition-colors"
                            >
                              {p.province_name}
                            </Link>
                            {i === 0 && <span className="ml-1 text-[9px] text-emerald-600 font-medium">Termurah</span>}
                            {i === mapPrices.length - 1 && mapPrices.length > 1 && (
                              <span className="ml-1 text-[9px] text-red-600 font-medium">Termahal</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold font-tabular text-warm-800 text-xs">
                            Rp {formatPrice(p.price)}
                          </td>
                          <td
                            className={`px-2 py-1.5 text-right font-tabular text-xs font-medium ${
                              vsAvg > 2 ? "text-red-600" : vsAvg < -2 ? "text-emerald-600" : "text-warm-400"
                            }`}
                          >
                            {vsAvg > 0 ? "+" : ""}{vsAvg.toFixed(1)}%
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
        Data terakhir diperbarui: {formatDateLong(latestDate)} · Sumber: Bank Indonesia PIHPS
      </p>
    </div>
  );
}

"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PriceChart } from "@/components/PriceChart";
import { IndonesiaMap } from "@/components/IndonesiaMap";
import { DateRangePicker } from "@/components/DateRangePicker";
import { supabase } from "@/lib/supabase";
import {
  formatRupiah,
  formatPrice,
  formatDateLong,
  formatDateShort,
  calcPctDiff,
} from "@/lib/utils";
import type { Commodity, TrendPoint } from "@/lib/types";

interface Props {
  commodity: Commodity;
  todayPrices: any[];
  nationalAvg: number;
  trend: TrendPoint[];
  latestDate: string;
  multiDayPrices: any[]; // 5-day prices for all provinces
  multiDayDates: string[];
}

export function CommodityDetailClient({
  commodity,
  todayPrices,
  nationalAvg,
  trend,
  latestDate,
  multiDayPrices,
  multiDayDates,
}: Props) {
  const dataStart = trend.length > 0 ? trend[0].date : latestDate;
  const dataEnd = trend.length > 0 ? trend[trend.length - 1].date : latestDate;

  const [startDate, setStartDate] = useState(dataStart);
  const [endDate, setEndDate] = useState(dataEnd);
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      const { data } = await supabase
        .from("prices")
        .select("date, price, province_id")
        .eq("commodity_id", commodity.id)
        .eq("market_type", "traditional")
        .gte("date", startDate)
        .lte("date", endDate)
        .gt("price", 0)
        .order("date", { ascending: true });
      setHistoricalPrices(data || []);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [commodity.id, startDate, endDate]);

  const dailyAvgs = useMemo(() => {
    const byDate = new Map<string, number[]>();
    for (const p of historicalPrices) {
      if (!byDate.has(p.date)) byDate.set(p.date, []);
      byDate.get(p.date)!.push(p.price);
    }
    return Array.from(byDate.entries())
      .map(([date, prices]) => ({
        date,
        price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [historicalPrices]);

  const periodChange = useMemo(() => {
    if (dailyAvgs.length < 2) return null;
    const first = dailyAvgs[0].price;
    const last = dailyAvgs[dailyAvgs.length - 1].price;
    return {
      absolute: last - first,
      pct: calcPctDiff(last, first),
      startDate: dailyAvgs[0].date,
      endDate: dailyAvgs[dailyAvgs.length - 1].date,
    };
  }, [dailyAvgs]);

  const mapData = useMemo(() => {
    return todayPrices.map((p) => ({
      provinceId: p.province_id || p.provinces?.id,
      price: p.price,
    }));
  }, [todayPrices]);

  const cheapest = todayPrices.length > 0 ? todayPrices[0] : null;
  const expensive = todayPrices.length > 0 ? todayPrices[todayPrices.length - 1] : null;
  const stdDev = useMemo(() => {
    if (todayPrices.length < 2) return 0;
    const prices = todayPrices.map((p) => p.price);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length);
  }, [todayPrices]);

  const handlePreset = (days: number) => {
    if (days === 1) {
      setStartDate(latestDate);
      setEndDate(latestDate);
    } else {
      const start = new Date(latestDate + "T00:00:00");
      start.setDate(start.getDate() - days);
      setStartDate(start.toISOString().split("T")[0]);
      setEndDate(latestDate);
    }
  };

  // Build 5-day table data: { provinceName, slug, pricesByDate: { [date]: price } }
  const tableData = useMemo(() => {
    const byProvince = new Map<string, { name: string; slug: string; prices: Map<string, number> }>();

    // National average row
    const natAvgPrices = new Map<string, number[]>();

    for (const p of multiDayPrices) {
      const provName = p.provinces?.name || "Unknown";
      const provSlug = p.provinces?.slug || "";
      const provId = p.province_id;

      if (!byProvince.has(provId)) {
        byProvince.set(provId, { name: provName, slug: provSlug, prices: new Map() });
      }
      byProvince.get(provId)!.prices.set(p.date, p.price);

      // For national avg
      if (!natAvgPrices.has(p.date)) natAvgPrices.set(p.date, []);
      natAvgPrices.get(p.date)!.push(p.price);
    }

    const natAvg: Record<string, number> = {};
    for (const [date, prices] of natAvgPrices.entries()) {
      natAvg[date] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    }

    const rows = Array.from(byProvince.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      slug: data.slug,
      prices: Object.fromEntries(data.prices),
    })).sort((a, b) => a.name.localeCompare(b.name));

    return { rows, natAvg };
  }, [multiDayPrices]);

  const formatShortDate = (d: string) => {
    const date = new Date(d + "T00:00:00");
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-warm-400 mb-6">
        <Link href="/" className="hover:text-warm-600">Beranda</Link>
        <span>/</span>
        <Link href="/komoditas" className="hover:text-warm-600">Komoditas</Link>
        <span>/</span>
        <span className="text-warm-600">{commodity.name}</span>
      </div>

      {/* Header + Big Price */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{commodity.icon}</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-warm-800 tracking-tight">{commodity.name}</h1>
            <p className="text-xs sm:text-sm text-warm-400">
              {commodity.name_en} · per {commodity.unit} · {formatDateLong(latestDate)}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-2xl sm:text-3xl font-bold text-warm-800 font-tabular">
            {formatRupiah(nationalAvg)}
          </span>
          <span className="text-xs sm:text-sm text-warm-400">rata-rata nasional</span>
          {periodChange && (
            <span className={`badge text-xs ml-2 ${periodChange.pct > 0 ? "badge-up" : periodChange.pct < 0 ? "badge-down" : "badge-stable"}`}>
              {periodChange.pct > 0 ? "↑" : "↓"} {Math.abs(periodChange.pct).toFixed(1)}%
            </span>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Termurah</p>
          <p className="text-xs sm:text-sm font-bold text-emerald-600 font-tabular">{cheapest ? formatRupiah(cheapest.price) : "-"}</p>
          <p className="text-[10px] sm:text-xs text-warm-500 mt-0.5 truncate">{cheapest?.provinces?.name}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Termahal</p>
          <p className="text-xs sm:text-sm font-bold text-red-600 font-tabular">{expensive ? formatRupiah(expensive.price) : "-"}</p>
          <p className="text-[10px] sm:text-xs text-warm-500 mt-0.5 truncate">{expensive?.provinces?.name}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Selisih</p>
          <p className="text-xs sm:text-sm font-bold text-warm-700 font-tabular">
            {cheapest && expensive ? formatRupiah(expensive.price - cheapest.price) : "-"}
          </p>
          <p className="text-[10px] sm:text-xs text-warm-500 mt-0.5">
            {cheapest && expensive ? `${calcPctDiff(expensive.price, cheapest.price).toFixed(0)}% gap` : ""}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Std. Deviasi</p>
          <p className="text-xs sm:text-sm font-bold text-warm-700 font-tabular">{formatRupiah(stdDev)}</p>
          <p className="text-[10px] sm:text-xs text-warm-500 mt-0.5">{todayPrices.length} provinsi</p>
        </div>
      </motion.div>

      {/* Trend Chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 sm:p-6 mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-warm-700">Tren Harga Nasional</h2>
            {periodChange && (
              <p className={`text-xs mt-0.5 font-medium ${periodChange.pct > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {periodChange.pct > 0 ? "↑" : "↓"} {formatRupiah(Math.abs(periodChange.absolute))} ({Math.abs(periodChange.pct).toFixed(1)}%)
                · {formatDateShort(periodChange.startDate)} → {formatDateShort(periodChange.endDate)}
              </p>
            )}
          </div>
          <DateRangePicker startDate={startDate} endDate={endDate} onStartChange={setStartDate} onEndChange={setEndDate} onPreset={handlePreset} />
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center h-48 sm:h-64 text-warm-400 text-sm">Memuat data historis...</div>
        ) : (
          <PriceChart data={dailyAvgs} height={280} />
        )}
      </motion.div>

      {/* Province Price Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card overflow-hidden mb-6">
        <div className="p-4 border-b border-warm-200">
          <h2 className="text-sm font-semibold text-warm-700">Harga per Provinsi</h2>
          <p className="text-xs text-warm-400 mt-0.5">{formatDateLong(latestDate)} · {todayPrices.length} provinsi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100">
                <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">#</th>
                <th className="text-left px-3 sm:px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">Provinsi</th>
                <th className="text-right px-3 sm:px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">Harga</th>
                <th className="text-right px-3 sm:px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">vs Nasional</th>
              </tr>
            </thead>
            <tbody>
              {todayPrices.map((p, i) => {
                const vsAvg = calcPctDiff(p.price, nationalAvg);
                return (
                  <tr key={p.provinces?.id || i} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                    <td className="px-3 sm:px-4 py-2 text-warm-400 font-tabular text-xs">{i + 1}</td>
                    <td className="px-3 sm:px-4 py-2">
                      <Link href={`/provinsi/${p.provinces?.slug}`} className="font-medium text-warm-700 hover:text-brand-orange transition-colors text-xs sm:text-sm">
                        {p.provinces?.name}
                      </Link>
                      {i === 0 && <span className="ml-1 sm:ml-2 badge badge-down text-[9px] sm:text-[10px]">Termurah</span>}
                      {i === todayPrices.length - 1 && todayPrices.length > 1 && (
                        <span className="ml-1 sm:ml-2 badge badge-up text-[9px] sm:text-[10px]">Termahal</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2 text-right font-semibold font-tabular text-warm-800 text-xs sm:text-sm">
                      Rp {formatPrice(p.price)}
                    </td>
                    <td className={`px-3 sm:px-4 py-2 text-right font-medium font-tabular text-xs ${
                      vsAvg > 2 ? "text-red-600" : vsAvg < -2 ? "text-emerald-600" : "text-warm-400"
                    }`}>
                      {vsAvg > 0 ? "+" : ""}{vsAvg.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* 5-Day Multi-Province Price Table (like BI PIHPS image 4) */}
      {multiDayDates.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card overflow-hidden mb-6">
          <div className="p-4 border-b border-warm-200">
            <h2 className="text-sm font-semibold text-warm-700">
              Tabel Harga {commodity.name} — {multiDayDates.length} Hari Terakhir
            </h2>
            <p className="text-xs text-warm-400 mt-0.5">Semua Provinsi · Pasar Tradisional</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-warm-50">
                <tr className="border-b border-warm-200">
                  <th className="text-left px-3 py-2.5 font-medium text-warm-500 sticky left-0 bg-warm-50 min-w-[140px]">Provinsi</th>
                  {multiDayDates.map((d) => (
                    <th key={d} className="text-right px-3 py-2.5 font-medium text-warm-500 min-w-[90px] whitespace-nowrap">
                      {formatShortDate(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* National avg row */}
                <tr className="border-b border-warm-200 bg-brand-orange-light font-semibold">
                  <td className="px-3 py-2 text-warm-800 sticky left-0 bg-brand-orange-light">Semua Provinsi</td>
                  {multiDayDates.map((d) => (
                    <td key={d} className="px-3 py-2 text-right font-tabular text-warm-800">
                      {tableData.natAvg[d] ? formatPrice(tableData.natAvg[d]) : "-"}
                    </td>
                  ))}
                </tr>
                {/* Province rows */}
                {tableData.rows.map((row) => (
                  <tr key={row.id} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                    <td className="px-3 py-2 sticky left-0 bg-white">
                      <Link href={`/provinsi/${row.slug}`} className="text-warm-700 hover:text-brand-orange transition-colors font-medium">
                        {row.name}
                      </Link>
                    </td>
                    {multiDayDates.map((d) => {
                      const price = row.prices[d];
                      const latestPrice = row.prices[multiDayDates[multiDayDates.length - 1]];
                      const isLatest = d === multiDayDates[multiDayDates.length - 1];
                      return (
                        <td key={d} className={`px-3 py-2 text-right font-tabular ${isLatest ? "font-semibold text-warm-800" : "text-warm-600"}`}>
                          {price ? formatPrice(price) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Indonesia Map (below tables) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-warm-700 mb-3">
          Peta Harga {commodity.name} per Provinsi
        </h2>
        <IndonesiaMap data={mapData} commodityName={commodity.name} unit={commodity.unit} />
      </motion.div>
    </div>
  );
}

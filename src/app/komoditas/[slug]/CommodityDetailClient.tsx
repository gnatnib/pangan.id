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
}

export function CommodityDetailClient({
  commodity,
  todayPrices,
  nationalAvg,
  trend,
  latestDate,
}: Props) {
  // Date range for the trend chart — derived from actual data range
  const dataStart = trend.length > 0 ? trend[0].date : latestDate;
  const dataEnd = trend.length > 0 ? trend[trend.length - 1].date : latestDate;

  const [startDate, setStartDate] = useState(dataStart);
  const [endDate, setEndDate] = useState(dataEnd);
  const [historicalPrices, setHistoricalPrices] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch historical data on date range change
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

  // Compute daily national averages from historical data
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

  // Period change
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

  // Map data from today's prices
  const mapData = useMemo(() => {
    return todayPrices.map((p) => ({
      provinceId: p.province_id || p.provinces?.id,
      price: p.price,
    }));
  }, [todayPrices]);

  // Stats
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
            <h1 className="text-2xl font-bold text-warm-800 tracking-tight">{commodity.name}</h1>
            <p className="text-sm text-warm-400">
              {commodity.name_en} · per {commodity.unit} · {formatDateLong(latestDate)}
            </p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 mt-3">
          <span className="text-3xl font-bold text-warm-800 font-tabular">
            {formatRupiah(nationalAvg)}
          </span>
          <span className="text-sm text-warm-400">rata-rata nasional</span>
          {periodChange && (
            <span
              className={`badge text-xs ml-2 ${
                periodChange.pct > 0 ? "badge-up" : periodChange.pct < 0 ? "badge-down" : "badge-stable"
              }`}
            >
              {periodChange.pct > 0 ? "↑" : "↓"} {Math.abs(periodChange.pct).toFixed(1)}%
            </span>
          )}
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Termurah</p>
          <p className="text-sm font-bold text-emerald-600 font-tabular">{cheapest ? formatRupiah(cheapest.price) : "-"}</p>
          <p className="text-xs text-warm-500 mt-0.5 truncate">{cheapest?.provinces?.name}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Termahal</p>
          <p className="text-sm font-bold text-red-600 font-tabular">{expensive ? formatRupiah(expensive.price) : "-"}</p>
          <p className="text-xs text-warm-500 mt-0.5 truncate">{expensive?.provinces?.name}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Selisih</p>
          <p className="text-sm font-bold text-warm-700 font-tabular">
            {cheapest && expensive ? formatRupiah(expensive.price - cheapest.price) : "-"}
          </p>
          <p className="text-xs text-warm-500 mt-0.5">
            {cheapest && expensive ? `${calcPctDiff(expensive.price, cheapest.price).toFixed(0)}% gap` : ""}
          </p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] text-warm-400 uppercase tracking-wide mb-1">Std. Deviasi</p>
          <p className="text-sm font-bold text-warm-700 font-tabular">{formatRupiah(stdDev)}</p>
          <p className="text-xs text-warm-500 mt-0.5">{todayPrices.length} provinsi</p>
        </div>
      </motion.div>

      {/* Trend Chart with Date Picker */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4 sm:p-6 mb-6">
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
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onPreset={handlePreset}
          />
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center h-64 text-warm-400 text-sm">Memuat data historis...</div>
        ) : (
          <PriceChart data={dailyAvgs} height={300} />
        )}
      </motion.div>

      {/* Province Price Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card overflow-hidden mb-6">
        <div className="p-4 border-b border-warm-200">
          <h2 className="text-sm font-semibold text-warm-700">Harga per Provinsi</h2>
          <p className="text-xs text-warm-400 mt-0.5">
            {formatDateLong(latestDate)} · {todayPrices.length} provinsi
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">Provinsi</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">Harga</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">vs Nasional</th>
              </tr>
            </thead>
            <tbody>
              {todayPrices.map((p, i) => {
                const vsAvg = calcPctDiff(p.price, nationalAvg);
                return (
                  <tr key={p.provinces?.id || i} className="border-b border-warm-50 hover:bg-warm-50 transition-colors">
                    <td className="px-4 py-2.5 text-warm-400 font-tabular">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/provinsi/${p.provinces?.slug}`} className="font-medium text-warm-700 hover:text-brand-orange transition-colors">
                        {p.provinces?.name}
                      </Link>
                      {i === 0 && <span className="ml-2 badge badge-down text-[10px]">Termurah</span>}
                      {i === todayPrices.length - 1 && todayPrices.length > 1 && (
                        <span className="ml-2 badge badge-up text-[10px]">Termahal</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold font-tabular text-warm-800">
                      Rp {formatPrice(p.price)}
                    </td>
                    <td className={`px-4 py-2.5 text-right font-medium font-tabular text-xs ${
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

      {/* Indonesia Map (BELOW the province table) */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-4 sm:p-6">
        <h2 className="text-sm font-semibold text-warm-700 mb-3">
          Peta Harga {commodity.name} per Provinsi
        </h2>
        <IndonesiaMap data={mapData} commodityName={commodity.name} unit={commodity.unit} />
      </motion.div>
    </div>
  );
}

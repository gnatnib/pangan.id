"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { formatRupiah, formatDateShort, formatPrice } from "@/lib/utils";
import type { Commodity, Province, TrendPoint } from "@/lib/types";

const COLORS = ["#029746", "#ee8d00", "#dc2626", "#6366f1"];

interface Props {
  commodities: Commodity[];
  provinces: Province[];
}

export function BandingkanClient({ commodities, provinces }: Props) {
  const [selectedCommodity, setSelectedCommodity] = useState<number | null>(
    commodities[0]?.id || null
  );
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [range, setRange] = useState(30);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleProvince = (id: string) => {
    setSelectedProvinces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  useEffect(() => {
    if (!selectedCommodity || selectedProvinces.length === 0) {
      setChartData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - range);

      const { data } = await supabase
        .from("prices")
        .select("date, price, province_id")
        .eq("commodity_id", selectedCommodity)
        .eq("market_type", "traditional")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate)
        .in("province_id", selectedProvinces)
        .gt("price", 0)
        .order("date", { ascending: true });

      if (data) {
        // Pivot data: date -> { date, province1: price, province2: price, ... }
        const dateMap = new Map<string, Record<string, any>>();
        for (const row of data) {
          if (!dateMap.has(row.date)) {
            dateMap.set(row.date, { date: row.date });
          }
          dateMap.get(row.date)![row.province_id] = row.price;
        }
        setChartData(Array.from(dateMap.values()));
      }
      setLoading(false);
    };

    fetchData();
  }, [selectedCommodity, selectedProvinces, range]);

  const selectedProvNames = useMemo(() => {
    const map = new Map(provinces.map((p) => [p.id, p.name]));
    return selectedProvinces.map((id) => ({ id, name: map.get(id) || id }));
  }, [selectedProvinces, provinces]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-warm-200 rounded-lg px-3 py-2 shadow-sm text-xs">
          <p className="text-warm-500 mb-1">{formatDateShort(label)}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }} className="font-medium">
              {provinces.find((prov) => prov.id === p.dataKey)?.name}: {formatRupiah(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container-page py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-warm-800 tracking-tight">
          Bandingkan Harga
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Pilih komoditas dan provinsi untuk membandingkan harga
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar Controls */}
        <div className="space-y-5">
          {/* Commodity select */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-2 block">
              1. Pilih Komoditas
            </label>
            <select
              value={selectedCommodity || ""}
              onChange={(e) => setSelectedCommodity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-warm-200 text-sm text-warm-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
            >
              {commodities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Province select */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-2 block">
              2. Pilih Provinsi (maks. 4)
            </label>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {provinces.map((p) => {
                const isSelected = selectedProvinces.includes(p.id);
                const colorIdx = selectedProvinces.indexOf(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleProvince(p.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
                      isSelected
                        ? "bg-warm-800 text-white"
                        : "text-warm-600 hover:bg-warm-100"
                    }`}
                  >
                    {isSelected && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[colorIdx] }}
                      />
                    )}
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Range */}
          <div className="card p-4">
            <label className="text-xs font-semibold text-warm-400 uppercase tracking-wide mb-2 block">
              3. Periode
            </label>
            <div className="flex gap-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setRange(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    range === d
                      ? "bg-warm-800 text-white"
                      : "bg-warm-100 text-warm-500 hover:bg-warm-200"
                  }`}
                >
                  {d} hari
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart area */}
        <div className="lg:col-span-2">
          <div className="card p-4 sm:p-6">
            {selectedProvinces.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-warm-400 text-sm">
                Pilih minimal 1 provinsi untuk melihat perbandingan
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-80 text-warm-400 text-sm">
                Memuat data...
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-80 text-warm-400 text-sm">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-3 mb-4">
                  {selectedProvNames.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 text-xs font-medium"
                    >
                      <span
                        className="w-3 h-0.5 rounded-full"
                        style={{ backgroundColor: COLORS[i] }}
                      />
                      {p.name}
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={chartData}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => {
                        const date = new Date(d + "T00:00:00");
                        return `${date.getDate()}/${date.getMonth() + 1}`;
                      }}
                      tick={{ fontSize: 11, fill: "#a3a39e" }}
                      axisLine={{ stroke: "#e5e5e0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`}
                      tick={{ fontSize: 11, fill: "#a3a39e" }}
                      axisLine={false}
                      tickLine={false}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {selectedProvinces.map((provId, i) => (
                      <Line
                        key={provId}
                        type="monotone"
                        dataKey={provId}
                        stroke={COLORS[i]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        connectNulls={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

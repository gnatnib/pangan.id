"use client";

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  LineChart,
  Line,
} from "recharts";
import { formatRupiah, formatDateShort } from "@/lib/utils";
import type { TrendPoint } from "@/lib/types";

interface PriceChartProps {
  data: TrendPoint[];
  color?: string;
  height?: number;
  showAxis?: boolean;
  showTooltip?: boolean;
}

export function PriceChart({
  data,
  color = "#029746",
  height = 300,
  showAxis = true,
  showTooltip = true,
}: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-warm-400 text-sm"
        style={{ height }}
      >
        Belum ada data historis
      </div>
    );
  }

  // Calculate Y-axis domain with 5% padding to show fluctuations clearly
  const prices = data.map((d) => d.price).filter((p) => p > 0);
  const minVal = Math.min(...prices);
  const maxVal = Math.max(...prices);
  const range = maxVal - minVal;
  const padding = range > 0 ? range * 0.15 : maxVal * 0.05;
  const yMin = Math.max(0, Math.floor((minVal - padding) / 100) * 100);
  const yMax = Math.ceil((maxVal + padding) / 100) * 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-warm-200 rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs text-warm-500 mb-0.5">
            {formatDateShort(label)}
          </p>
          <p className="text-sm font-semibold text-warm-800">
            {formatRupiah(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.12} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxis && (
          <>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => {
                const date = new Date(d + "T00:00:00");
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
              tick={{ fontSize: 11, fill: "#a3a39e" }}
              axisLine={{ stroke: "#e5e5e0" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}rb`}
              tick={{ fontSize: 11, fill: "#a3a39e" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
          </>
        )}
        {showTooltip && <Tooltip content={<CustomTooltip />} />}
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${color.replace("#", "")})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* Mini sparkline for cards — fills parent container */
export function SparkLine({
  data,
  color = "#029746",
}: {
  data: TrendPoint[];
  color?: string;
}) {
  if (!data || data.length < 2) return null;

  const prices = data.map((d) => d.price).filter((p) => p > 0);
  const minVal = Math.min(...prices);
  const maxVal = Math.max(...prices);
  const range = maxVal - minVal;
  const padding = range > 0 ? range * 0.1 : maxVal * 0.02;
  const yMin = Math.max(0, minVal - padding);
  const yMax = maxVal + padding;

  const gradientId = `spark-${color.replace("#", "")}`;

  const CustomSparkTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload as TrendPoint;
      return (
        <div className="bg-[#2b3541] border border-[#3f4a59] rounded-md px-3 py-2 shadow-lg z-50">
          <p className="text-white text-xs whitespace-nowrap mb-1">
            Harga : Rp {point.price.toLocaleString("id-ID")}
          </p>
          <p className="text-white text-xs whitespace-nowrap">
            Tanggal : {point.date}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[yMin, yMax]} hide />
        <Tooltip content={<CustomSparkTooltip />} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

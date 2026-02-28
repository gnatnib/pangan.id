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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <YAxis domain={[yMin, yMax]} hide />
        <Line
          type="monotone"
          dataKey="price"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

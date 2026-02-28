"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatPrice, formatPct, formatChange, getPriceChangeColor } from "@/lib/utils";
import { SparkLine } from "@/components/PriceChart";
import type { CommoditySummary, TrendPoint } from "@/lib/types";

interface PriceCardProps {
  summary: CommoditySummary;
  index?: number;
  sparkData?: TrendPoint[];
}

export function PriceCard({ summary, index = 0, sparkData }: PriceCardProps) {
  const { commodity, avgPrice, priceChange, priceChangePct } = summary;
  const isUp = priceChange > 0;
  const isDown = priceChange < 0;

  // Color for sparkline: red if price went up, green if down
  const sparkColor = isUp ? "#dc2626" : isDown ? "#029746" : "#a3a39e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Link href={`/komoditas/${commodity.slug}`}>
        <div className="card p-4 hover:-translate-y-0.5 cursor-pointer group">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{commodity.icon}</span>
              <span className="text-xs font-medium text-warm-400 uppercase tracking-wide">
                {commodity.category}
              </span>
            </div>
            <span
              className={`badge ${
                isUp ? "badge-up" : isDown ? "badge-down" : "badge-stable"
              }`}
            >
              {isUp ? "↑" : isDown ? "↓" : "→"}{" "}
              {formatPct(priceChangePct)}
            </span>
          </div>

          <h3 className="text-sm font-semibold text-warm-700 mb-1 group-hover:text-brand-orange transition-colors leading-tight">
            {commodity.name}
          </h3>

          <div className="flex items-end justify-between mt-2">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-warm-800 font-tabular">
                  Rp {formatPrice(avgPrice)}
                </span>
                <span className="text-xs text-warm-400">/{commodity.unit}</span>
              </div>
              {priceChange !== null && priceChange !== 0 && (
                <p className={`text-xs mt-0.5 font-medium ${getPriceChangeColor(priceChange)}`}>
                  {formatChange(priceChange)}
                </p>
              )}
            </div>

            {/* Sparkline chart */}
            {sparkData && sparkData.length > 1 && (
              <div className="shrink-0 ml-2">
                <SparkLine data={sparkData} color={sparkColor} width={70} height={28} />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/* Skeleton loader */
export function PriceCardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="skeleton w-16 h-5" />
        <div className="skeleton w-14 h-5" />
      </div>
      <div className="skeleton w-3/4 h-4 mb-3" />
      <div className="skeleton w-1/2 h-7" />
    </div>
  );
}

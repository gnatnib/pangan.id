"use client";

import { useState } from "react";
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
  const [isNavigating, setIsNavigating] = useState(false);

  const sparkColor = isUp ? "#dc2626" : isDown ? "#029746" : "#a3a39e";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="h-full relative hover:z-50"
      style={{ overflow: 'visible' }}
    >
      <Link
        href={`/komoditas/${commodity.slug}`}
        className="block h-full overflow-visible"
        onClick={() => setIsNavigating(true)}
      >
        <div className="card p-3 sm:p-4 hover:-translate-y-0.5 cursor-pointer group overflow-visible flex flex-col h-full relative">
          {isNavigating && (
            <div className="absolute inset-0 z-10 rounded-2xl bg-white/75 backdrop-blur-[1px]">
              <div className="absolute left-3 right-3 top-0 h-1 overflow-hidden rounded-full bg-warm-100">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-orange" />
              </div>
              <div className="absolute bottom-3 right-3 rounded-full bg-warm-800 px-2.5 py-1 text-[10px] font-medium text-white shadow-sm">
                Membuka...
              </div>
            </div>
          )}

          <div className="flex items-start justify-between mb-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base sm:text-lg shrink-0">{commodity.icon}</span>
              <span className="text-[10px] sm:text-xs font-medium text-warm-400 uppercase tracking-wide truncate">
                {commodity.category}
              </span>
            </div>
            <span
              className={`badge text-[10px] sm:text-xs shrink-0 ${
                isUp ? "badge-up" : isDown ? "badge-down" : "badge-stable"
              }`}
            >
              {isUp ? "↑" : isDown ? "↓" : "→"}{" "}
              {formatPct(priceChangePct)}
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-semibold text-warm-700 mb-2 group-hover:text-brand-orange transition-colors leading-tight line-clamp-2 flex-grow">
            {commodity.name}
          </h3>

          <div className="flex items-end justify-between mt-auto gap-1 shrink-0">
            <div className="min-w-0">
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-base sm:text-xl font-bold text-warm-800 font-tabular">
                  Rp {formatPrice(avgPrice)}
                </span>
                <span className="text-[10px] sm:text-xs text-warm-400">/{commodity.unit}</span>
              </div>
              {priceChange !== null && priceChange !== 0 && (
                <p className={`text-[10px] sm:text-xs mt-0.5 font-medium ${getPriceChangeColor(priceChange)}`}>
                  {formatChange(priceChange)}
                </p>
              )}
            </div>

            {/* Sparkline chart — constrained to prevent overflow */}
            {sparkData && sparkData.length > 1 && (
              <div className="shrink-0 w-[60px] h-[28px] sm:w-[80px] sm:h-[34px]">
                <SparkLine data={sparkData} color={sparkColor} />
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function PriceCardSkeleton() {
  return (
    <div className="card p-3 sm:p-4 h-full flex flex-col">
      <div className="flex items-start justify-between mb-3 shrink-0">
        <div className="skeleton w-16 h-5" />
        <div className="skeleton w-14 h-5" />
      </div>
      <div className="skeleton w-3/4 h-4 mb-3 flex-grow" />
      <div className="skeleton w-1/2 h-7 mt-auto shrink-0" />
    </div>
  );
}

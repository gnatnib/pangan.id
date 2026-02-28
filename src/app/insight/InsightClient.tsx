"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  formatRupiah,
  formatDateLong,
  calcPctDiff,
} from "@/lib/utils";
import type { Commodity, Province } from "@/lib/types";

interface InsightItem {
  id: string;
  type: "increase" | "decrease" | "disparity";
  title: string;
  description: string;
  value: number;
  icon: string;
  link?: string;
}

interface Props {
  commodities: Commodity[];
  provinces: Province[];
  currentAvgs: any[];
  pastAvgs: any[];
  todayPrices: any[];
  latestDate: string;
}

export function InsightClient({
  commodities,
  provinces,
  currentAvgs,
  pastAvgs,
  todayPrices,
  latestDate,
}: Props) {
  const commodityMap = useMemo(
    () => new Map(commodities.map((c) => [c.id, c])),
    [commodities]
  );
  const provinceMap = useMemo(
    () => new Map(provinces.map((p) => [p.id, p])),
    [provinces]
  );

  const insights = useMemo(() => {
    const items: InsightItem[] = [];

    // 1. Weekly price changes
    const pastMap = new Map(pastAvgs.map((p) => [p.commodity_id, Number(p.avg_price)]));

    for (const curr of currentAvgs) {
      const pastPrice = pastMap.get(curr.commodity_id);
      if (!pastPrice) continue;

      const pctChange = calcPctDiff(Number(curr.avg_price), pastPrice);
      const commodity = commodityMap.get(curr.commodity_id);
      if (!commodity || Math.abs(pctChange) < 3) continue;

      items.push({
        id: `change-${curr.commodity_id}`,
        type: pctChange > 0 ? "increase" : "decrease",
        title:
          pctChange > 0
            ? `${commodity.name} naik ${Math.abs(pctChange).toFixed(1)}% dalam seminggu`
            : `${commodity.name} turun ${Math.abs(pctChange).toFixed(1)}% dalam seminggu`,
        description: `Harga rata-rata nasional berubah dari ${formatRupiah(pastPrice)} menjadi ${formatRupiah(Number(curr.avg_price))}.`,
        value: Math.abs(pctChange),
        icon: pctChange > 0 ? "📈" : "📉",
        link: `/komoditas/${commodity.slug}`,
      });
    }

    // 2. Price disparities
    const byCommodity = new Map<number, { province_id: string; price: number }[]>();
    for (const p of todayPrices) {
      if (!byCommodity.has(p.commodity_id)) byCommodity.set(p.commodity_id, []);
      byCommodity.get(p.commodity_id)!.push({ province_id: p.province_id, price: p.price });
    }

    for (const [commodityId, provPrices] of byCommodity) {
      if (provPrices.length < 2) continue;
      provPrices.sort((a, b) => a.price - b.price);

      const cheapest = provPrices[0];
      const expensive = provPrices[provPrices.length - 1];
      const pctDiff = calcPctDiff(expensive.price, cheapest.price);
      const commodity = commodityMap.get(commodityId);
      const expProvince = provinceMap.get(expensive.province_id);
      const cheapProvince = provinceMap.get(cheapest.province_id);

      if (!commodity || !expProvince || !cheapProvince || pctDiff < 30) continue;

      items.push({
        id: `disparity-${commodityId}`,
        type: "disparity",
        title: `${commodity.name} di ${expProvince.name} ${pctDiff.toFixed(0)}% lebih mahal dari ${cheapProvince.name}`,
        description: `${formatRupiah(expensive.price)} vs ${formatRupiah(cheapest.price)}. Selisih ${formatRupiah(expensive.price - cheapest.price)}.`,
        value: pctDiff,
        icon: "⚖️",
        link: `/komoditas/${commodity.slug}`,
      });
    }

    // Sort by value (most significant first)
    items.sort((a, b) => b.value - a.value);
    return items;
  }, [commodityMap, provinceMap, currentAvgs, pastAvgs, todayPrices]);

  return (
    <div className="container-page py-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-warm-800 tracking-tight">
          Insight Harga Pangan
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          Analisis otomatis berdasarkan data {formatDateLong(latestDate)}
        </p>
      </motion.div>

      {insights.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-warm-400">
            Belum ada insight tersedia. Data akan muncul setelah scraper berjalan beberapa hari.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div className="card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{insight.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-warm-800 text-sm leading-tight">
                      {insight.title}
                    </h3>
                    <p className="text-sm text-warm-500 mt-1">
                      {insight.description}
                    </p>
                    {insight.link && (
                      <Link
                        href={insight.link}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-orange hover:text-brand-orange/80 mt-2 transition-colors"
                      >
                        Lihat detail →
                      </Link>
                    )}
                  </div>
                  <span
                    className={`badge text-xs whitespace-nowrap ${
                      insight.type === "increase"
                        ? "badge-up"
                        : insight.type === "decrease"
                        ? "badge-down"
                        : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {insight.type === "increase"
                      ? "Kenaikan"
                      : insight.type === "decrease"
                      ? "Penurunan"
                      : "Disparitas"}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

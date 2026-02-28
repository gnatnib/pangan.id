"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatRupiah } from "@/lib/utils";

// Simplified Indonesia province paths (each province is an SVG path)
// Province ID -> SVG path data (simplified from Natural Earth / BPS boundaries)
const PROVINCE_PATHS: Record<string, { d: string; cx: number; cy: number; name: string }> = {
  "11": { d: "M 75 160 L 95 140 L 120 135 L 130 155 L 110 170 L 85 175 Z", cx: 100, cy: 155, name: "Aceh" },
  "12": { d: "M 85 175 L 110 170 L 130 155 L 150 165 L 155 185 L 135 195 L 105 190 Z", cx: 120, cy: 178, name: "Sumatera Utara" },
  "13": { d: "M 105 190 L 135 195 L 130 215 L 110 220 L 95 210 Z", cx: 115, cy: 205, name: "Sumatera Barat" },
  "14": { d: "M 135 195 L 155 185 L 170 195 L 165 215 L 145 220 L 130 215 Z", cx: 150, cy: 205, name: "Riau" },
  "15": { d: "M 110 220 L 130 215 L 145 220 L 140 240 L 120 245 Z", cx: 130, cy: 230, name: "Jambi" },
  "16": { d: "M 120 245 L 140 240 L 165 245 L 175 260 L 155 275 L 130 265 Z", cx: 148, cy: 255, name: "Sumatera Selatan" },
  "17": { d: "M 95 210 L 110 220 L 120 245 L 105 255 L 85 240 Z", cx: 103, cy: 232, name: "Bengkulu" },
  "18": { d: "M 130 265 L 155 275 L 175 260 L 195 270 L 200 290 L 170 295 L 145 285 Z", cx: 168, cy: 278, name: "Lampung" },
  "19": { d: "M 165 215 L 185 210 L 195 225 L 185 240 L 165 245 Z", cx: 179, cy: 227, name: "Kep. Bangka Belitung" },
  "21": { d: "M 170 195 L 190 188 L 200 198 L 195 210 L 185 210 L 165 215 Z", cx: 183, cy: 200, name: "Kepulauan Riau" },
  "31": { d: "M 290 310 L 305 305 L 315 315 L 305 325 L 290 320 Z", cx: 300, cy: 315, name: "DKI Jakarta" },
  "32": { d: "M 275 295 L 290 290 L 315 300 L 340 310 L 335 330 L 305 325 L 290 320 L 275 310 Z", cx: 306, cy: 310, name: "Jawa Barat" },
  "33": { d: "M 335 330 L 340 310 L 370 305 L 395 315 L 390 335 L 365 340 L 340 340 Z", cx: 365, cy: 325, name: "Jawa Tengah" },
  "34": { d: "M 390 335 L 395 315 L 415 320 L 415 340 L 400 345 Z", cx: 403, cy: 330, name: "DI Yogyakarta" },
  "35": { d: "M 400 345 L 415 340 L 415 320 L 440 310 L 465 315 L 470 335 L 450 350 L 420 355 Z", cx: 438, cy: 333, name: "Jawa Timur" },
  "36": { d: "M 240 295 L 260 285 L 275 295 L 275 310 L 260 315 L 245 308 Z", cx: 258, cy: 300, name: "Banten" },
  "51": { d: "M 475 340 L 495 335 L 510 345 L 505 355 L 485 358 L 475 350 Z", cx: 491, cy: 347, name: "Bali" },
  "52": { d: "M 515 350 L 540 340 L 565 345 L 560 365 L 535 370 L 515 360 Z", cx: 538, cy: 355, name: "Nusa Tenggara Barat" },
  "53": { d: "M 570 350 L 595 340 L 630 345 L 660 355 L 650 375 L 615 380 L 580 370 Z", cx: 615, cy: 360, name: "Nusa Tenggara Timur" },
  "61": { d: "M 290 210 L 320 195 L 355 200 L 365 225 L 340 245 L 305 240 L 285 230 Z", cx: 322, cy: 220, name: "Kalimantan Barat" },
  "62": { d: "M 305 240 L 340 245 L 365 225 L 390 230 L 395 260 L 370 275 L 340 270 L 315 265 Z", cx: 350, cy: 255, name: "Kalimantan Tengah" },
  "63": { d: "M 315 265 L 340 270 L 370 275 L 395 260 L 410 265 L 400 290 L 370 295 L 340 290 Z", cx: 360, cy: 278, name: "Kalimantan Selatan" },
  "64": { d: "M 365 225 L 390 230 L 410 215 L 425 225 L 420 250 L 410 265 L 395 260 Z", cx: 405, cy: 240, name: "Kalimantan Timur" },
  "65": { d: "M 355 200 L 380 190 L 410 195 L 410 215 L 390 230 L 365 225 Z", cx: 385, cy: 210, name: "Kalimantan Utara" },
  "71": { d: "M 490 215 L 510 200 L 535 205 L 540 225 L 520 235 L 500 230 Z", cx: 515, cy: 218, name: "Sulawesi Utara" },
  "72": { d: "M 475 240 L 500 230 L 520 235 L 530 255 L 510 270 L 485 265 Z", cx: 503, cy: 252, name: "Sulawesi Tengah" },
  "73": { d: "M 470 290 L 490 280 L 510 285 L 520 305 L 505 315 L 480 310 Z", cx: 495, cy: 298, name: "Sulawesi Selatan" },
  "74": { d: "M 510 270 L 530 255 L 545 265 L 545 290 L 520 300 L 510 285 Z", cx: 527, cy: 278, name: "Sulawesi Tenggara" },
  "75": { d: "M 490 215 L 475 230 L 475 240 L 500 230 Z", cx: 485, cy: 228, name: "Gorontalo" },
  "76": { d: "M 455 275 L 470 270 L 470 290 L 480 310 L 465 305 L 450 290 Z", cx: 465, cy: 290, name: "Sulawesi Barat" },
  "81": { d: "M 610 255 L 630 245 L 655 250 L 660 270 L 640 285 L 615 275 Z", cx: 635, cy: 265, name: "Maluku" },
  "82": { d: "M 575 215 L 595 205 L 615 210 L 620 230 L 600 240 L 580 235 Z", cx: 598, cy: 222, name: "Maluku Utara" },
  "91": { d: "M 680 225 L 720 210 L 770 215 L 790 235 L 780 260 L 740 270 L 700 260 L 680 245 Z", cx: 735, cy: 240, name: "Papua" },
  "92": { d: "M 650 230 L 680 225 L 680 245 L 700 260 L 680 270 L 655 265 L 645 250 Z", cx: 670, cy: 248, name: "Papua Barat" },
};

interface MapDataPoint {
  provinceId: string;
  price: number;
  provinceName?: string;
}

interface IndonesiaMapProps {
  data: MapDataPoint[];
  commodityName?: string;
  unit?: string;
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  name: string;
  price: number;
  vsAvg: number;
}

export function IndonesiaMap({ data, commodityName = "", unit = "Kg" }: IndonesiaMapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false, x: 0, y: 0, name: "", price: 0, vsAvg: 0,
  });

  const { priceMap, minPrice, maxPrice, avgPrice } = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) {
      map.set(d.provinceId, d.price);
    }
    const prices = data.map((d) => d.price).filter((p) => p > 0);
    return {
      priceMap: map,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
    };
  }, [data]);

  const getColor = (price: number | undefined) => {
    if (!price || price <= 0 || maxPrice === minPrice) return "#d4d4cf";
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    // Green (cheap) -> Yellow -> Red (expensive)
    if (ratio < 0.5) {
      const r = Math.round(34 + ratio * 2 * 221);
      const g = Math.round(197 - ratio * 2 * 50);
      const b = Math.round(94 - ratio * 2 * 50);
      return `rgb(${r},${g},${b})`;
    } else {
      const t = (ratio - 0.5) * 2;
      const r = Math.round(255 - t * 35);
      const g = Math.round(147 - t * 107);
      const b = Math.round(44 - t * 6);
      return `rgb(${r},${g},${b})`;
    }
  };

  const handleMouseEnter = (e: React.MouseEvent, provId: string) => {
    const prov = PROVINCE_PATHS[provId];
    const price = priceMap.get(provId) || 0;
    if (!prov) return;
    const rect = e.currentTarget.closest("svg")?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      show: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      name: prov.name,
      price,
      vsAvg: avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0,
    });
  };

  return (
    <div className="relative">
      <svg
        viewBox="50 120 780 280"
        className="w-full h-auto"
        style={{ maxHeight: "400px" }}
      >
        {/* Sea background */}
        <rect x="50" y="120" width="780" height="280" fill="#f0f7ff" rx="8" />

        {/* Province paths */}
        {Object.entries(PROVINCE_PATHS).map(([id, prov]) => {
          const price = priceMap.get(id);
          return (
            <path
              key={id}
              d={prov.d}
              fill={getColor(price)}
              stroke="white"
              strokeWidth="1.5"
              className="cursor-pointer transition-all duration-150 hover:brightness-90 hover:stroke-warm-800 hover:stroke-2"
              onMouseEnter={(e) => handleMouseEnter(e, id)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.closest("svg")?.getBoundingClientRect();
                if (rect) {
                  setTooltip((prev) => ({
                    ...prev,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top - 10,
                  }));
                }
              }}
              onMouseLeave={() => setTooltip((prev) => ({ ...prev, show: false }))}
            />
          );
        })}
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {tooltip.show && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute pointer-events-none bg-white border border-warm-200 rounded-lg px-3 py-2 shadow-lg z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-xs font-bold text-warm-800">{tooltip.name}</p>
            <p className="text-sm font-semibold text-warm-700 font-tabular">
              {tooltip.price > 0 ? formatRupiah(tooltip.price) : "Tidak ada data"}
            </p>
            {tooltip.price > 0 && (
              <p
                className={`text-[10px] font-medium ${
                  tooltip.vsAvg > 2
                    ? "text-red-600"
                    : tooltip.vsAvg < -2
                    ? "text-emerald-600"
                    : "text-warm-400"
                }`}
              >
                {tooltip.vsAvg > 0 ? "+" : ""}
                {tooltip.vsAvg.toFixed(1)}% vs rata-rata
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {minPrice > 0 && maxPrice > 0 && (
        <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-warm-500">
          <span className="font-tabular">{formatRupiah(minPrice)}</span>
          <div className="flex h-2 rounded-full overflow-hidden" style={{ width: "120px" }}>
            <div className="flex-1" style={{ background: "linear-gradient(to right, #22c55e, #eab308, #dc2626)" }} />
          </div>
          <span className="font-tabular">{formatRupiah(maxPrice)}</span>
          <span className="ml-2 text-warm-400">per {unit}</span>
        </div>
      )}
    </div>
  );
}

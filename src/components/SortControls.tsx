"use client";

import { motion } from "framer-motion";

interface SortControlsProps {
  value: string;
  onChange: (value: string) => void;
}

const options = [
  { value: "change-desc", label: "Kenaikan Tertinggi" },
  { value: "change-asc", label: "Penurunan Tertinggi" },
  { value: "price-desc", label: "Harga Tertinggi" },
  { value: "price-asc", label: "Harga Terendah" },
  { value: "name-asc", label: "A — Z" },
];

export function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <span className="text-xs text-warm-400 uppercase tracking-wide mr-1">
        Urutkan:
      </span>
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onChange(opt.value)}
            className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "text-white"
                : "bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="sort-active-bg"
                className="absolute inset-0 rounded-md bg-warm-800"
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
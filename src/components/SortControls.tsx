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
      <span className="mr-1 text-xs uppercase tracking-wide text-warm-400">
        Urutkan:
      </span>
      {options.map((opt, i) => {
        const isActive = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 6, backgroundColor: "#f5ece4", color: "#8a6a55" }}
            animate={{
              opacity: 1,
              y: 0,
              backgroundColor: isActive ? "#4a3427" : "#f5ece4",
              color: isActive ? "#ffffff" : "#8a6a55",
            }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(opt.value)}
            className="rounded-md px-3 py-1.5 text-xs font-medium shadow-sm"
          >
            {opt.label}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(opt.value)}
            className={`relative overflow-hidden rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "text-white"
                : "bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700"
            }`}
          >
            {isActive && (
              mounted ? (
                <motion.span
                  layoutId="sort-active-bg"
                  className="absolute inset-0 rounded-md bg-warm-800"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : (
                <span className="absolute inset-0 rounded-md bg-warm-800" />
              )
            )}
            <span className="relative z-10">{opt.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

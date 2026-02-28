"use client";

import { motion } from "framer-motion";

interface MarketToggleProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarketToggle({ value, onChange }: MarketToggleProps) {
  return (
    <div className="inline-flex items-center bg-warm-100 rounded-lg p-0.5">
      {[
        { id: "traditional", label: "Pasar Tradisional" },
        { id: "modern", label: "Pasar Modern" },
      ].map((option) => (
        <button
          key={option.id}
          onClick={() => onChange(option.id)}
          className={`relative px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            value === option.id ? "text-warm-800" : "text-warm-400 hover:text-warm-600"
          }`}
        >
          {value === option.id && (
            <motion.div
              layoutId="market-toggle"
              className="absolute inset-0 bg-white rounded-md shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <span className="relative z-10">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

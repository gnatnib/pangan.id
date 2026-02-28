"use client";

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
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-warm-400 uppercase tracking-wide mr-1">
        Urutkan:
      </span>
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? "bg-warm-800 text-white"
                : "bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

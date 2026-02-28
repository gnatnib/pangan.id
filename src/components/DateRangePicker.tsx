"use client";

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
  onPreset?: (days: number) => void;
}

const presets = [
  { label: "Terkini", days: 1 },
  { label: "7 Hari Terakhir", days: 7 },
  { label: "14 Hari Terakhir", days: 14 },
  { label: "30 Hari Terakhir", days: 30 },
  { label: "90 Hari Terakhir", days: 90 },
];

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onPreset,
}: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p.days}
            onClick={() => onPreset?.(p.days)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-warm-100 text-warm-500 hover:bg-warm-200 hover:text-warm-700 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-1.5 text-sm">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="px-2 py-1.5 rounded-md border border-warm-200 text-warm-600 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
        />
        <span className="text-warm-400 text-xs">—</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          className="px-2 py-1.5 rounded-md border border-warm-200 text-warm-600 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange"
        />
      </div>
    </div>
  );
}

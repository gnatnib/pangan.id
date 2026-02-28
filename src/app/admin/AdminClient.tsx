"use client";

import { formatDateLong } from "@/lib/utils";
import type { ScrapeLog } from "@/lib/types";

interface Props {
  logs: ScrapeLog[];
  latestDate: string | null;
  coverage: { provinces: number; commodities: number; total: number };
}

export function AdminClient({ logs, latestDate, coverage }: Props) {
  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-warm-800 tracking-tight mb-1">
        Admin Dashboard
      </h1>
      <p className="text-sm text-warm-500 mb-8">
        Monitor kesehatan scraper dan kualitas data
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <p className="text-xs text-warm-400 mb-1">Data Terbaru</p>
          <p className="text-sm font-bold text-warm-800">
            {latestDate ? formatDateLong(latestDate) : "Belum ada data"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-warm-400 mb-1">Provinsi Tercakup</p>
          <p className="text-2xl font-bold text-warm-800">
            {coverage.provinces}
            <span className="text-sm font-normal text-warm-400"> / 38</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-warm-400 mb-1">Komoditas Tercakup</p>
          <p className="text-2xl font-bold text-warm-800">
            {coverage.commodities}
            <span className="text-sm font-normal text-warm-400"> / 21</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-warm-400 mb-1">Total Records</p>
          <p className="text-2xl font-bold text-warm-800">
            {coverage.total.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Scrape logs */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-warm-200">
          <h2 className="text-sm font-semibold text-warm-700">
            Scrape Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-100">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Tanggal
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Komoditas
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Provinsi
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Rows
                </th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Durasi
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Error
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-warm-400">
                    Belum ada log scraping
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-warm-50 hover:bg-warm-50"
                  >
                    <td className="px-4 py-2.5 text-warm-700 text-xs">
                      {log.scrape_date}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`badge text-[10px] ${
                          log.status === "success"
                            ? "badge-down"
                            : log.status === "partial"
                            ? "bg-amber-50 text-amber-700"
                            : "badge-up"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-tabular text-warm-600">
                      {log.commodities_scraped ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-tabular text-warm-600">
                      {log.provinces_scraped ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-tabular text-warm-600">
                      {log.rows_inserted ?? "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-tabular text-warm-500 text-xs">
                      {log.duration_seconds ? `${log.duration_seconds}s` : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-warm-400 text-xs max-w-[200px] truncate">
                      {log.error_message || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

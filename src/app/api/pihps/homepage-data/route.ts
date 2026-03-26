import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchPihpsCommodityTable, getDateDaysAgo } from "@/lib/pihps";
import type { CommoditySummary, TrendPoint } from "@/lib/types";

export const runtime = "nodejs";

// ── In-memory cache (5 minutes) ──────────────────────────────────────────────
let cachedData: {
  summaries: CommoditySummary[];
  latestDate: string;
  sparklines: Record<number, TrendPoint[]>;
} | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cacheTimestamp < CACHE_DURATION_MS) {
      return NextResponse.json(cachedData, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          "X-Cache": "HIT",
        },
      });
    }

    const roundTo50 = (num: number) => Math.round(num / 50) * 50;

    const { data: commodities } = await supabase
      .from("commodities")
      .select("*")
      .order("id");

    if (!commodities || commodities.length === 0) {
      const emptyResult = {
        summaries: [],
        latestDate: new Date().toISOString().split("T")[0],
        sparklines: {},
      };
      return NextResponse.json(emptyResult);
    }

    const today = new Date().toISOString().split("T")[0];
    const sourceStartDate = getDateDaysAgo(today, 30);

    const commodityTables = await Promise.all(
      commodities.map((commodity) =>
        fetchPihpsCommodityTable(commodity.slug, sourceStartDate, today, "traditional")
      )
    );

    const allDates = Array.from(
      new Set(commodityTables.flatMap((table) => Object.keys(table.nationalRow?.values || {})))
    ).sort();

    const latestDate = allDates[allDates.length - 1] || today;
    const sparkDates = allDates.slice(-6);
    const sparkDateSet = new Set(sparkDates);

    const sparklines: Record<number, TrendPoint[]> = {};
    const summaries: CommoditySummary[] = [];

    const tableBySlug = new Map(commodityTables.map((table) => [table.slug, table]));

    for (const commodity of commodities) {
      const table = tableBySlug.get(commodity.slug);
      const nationalValues = table?.nationalRow?.values || {};
      const latestNationalPrice = nationalValues[latestDate];

      if (!table?.nationalRow || !latestNationalPrice) continue;

      const sparkRows = sparkDates
        .filter((date) => sparkDateSet.has(date) && nationalValues[date])
        .map((date) => ({
          date,
          price: roundTo50(nationalValues[date]),
        }));

      sparklines[commodity.id] = sparkRows;

      const baselinePrice = sparkRows[0]?.price ?? null;
      const avgPrice = roundTo50(latestNationalPrice);

      const priceChange = baselinePrice !== null ? avgPrice - baselinePrice : 0;
      const priceChangePct =
        baselinePrice && baselinePrice > 0
          ? ((avgPrice - baselinePrice) / baselinePrice) * 100
          : 0;

      const latestProvinceRows = table.provinceRows
        .map((row) => ({
          province_name: row.name,
          price: row.values[latestDate] || null,
        }))
        .filter((row): row is { province_name: string; price: number } => row.price !== null);

      if (latestProvinceRows.length === 0) continue;

      const latestPricesForCommodity = latestProvinceRows.map((row) => row.price);
      const minPrice = Math.min(...latestPricesForCommodity);
      const maxPrice = Math.max(...latestPricesForCommodity);

      const sorted = [...latestProvinceRows].sort((a, b) => a.price - b.price);

      summaries.push({
        commodity: commodity as CommoditySummary["commodity"],
        avgPrice,
        prevAvgPrice: baselinePrice,
        priceChange,
        priceChangePct,
        minPrice,
        maxPrice,
        cheapestProvince: sorted[0]?.province_name || null,
        expensiveProvince: sorted[sorted.length - 1]?.province_name || null,
      });
    }

    const result = { summaries, latestDate, sparklines };

    // Update cache
    cachedData = result;
    cacheTimestamp = now;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[homepage-data] Error:", message);
    return NextResponse.json(
      { error: "Gagal memuat data harga. Silakan coba lagi." },
      { status: 500 }
    );
  }
}

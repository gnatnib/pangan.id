import { supabase } from "@/lib/supabase";
import { fetchPihpsCommodityTable, getDateDaysAgo } from "@/lib/pihps";
import type { Commodity, CommoditySummary, TrendPoint } from "@/lib/types";
import { HomeClient } from "./HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getHomepageData() {
  const roundTo50 = (num: number) => Math.round(num / 50) * 50;

  const { data: commodities } = await supabase
    .from("commodities")
    .select("*")
    .order("id");

  if (!commodities || commodities.length === 0) {
    return { summaries: [], latestDate: new Date().toISOString().split("T")[0], sparklines: {} };
  }

  const today = new Date().toISOString().split("T")[0];
  const sourceStartDate = getDateDaysAgo(today, 30);

  const commodityTables = await Promise.all(
    commodities.map((commodity) => fetchPihpsCommodityTable(commodity.slug, sourceStartDate, today, "traditional"))
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
    const priceChangePct = baselinePrice && baselinePrice > 0
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
      commodity: commodity as Commodity,
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

  return { summaries, latestDate, sparklines };
}

export default async function HomePage() {
  const { summaries, latestDate, sparklines } = await getHomepageData();

  // Serialize sparklines for client
  const sparklinesForClient: Record<number, { date: string; price: number }[]> = {};
  for (const [id, points] of Object.entries(sparklines)) {
    sparklinesForClient[Number(id)] = points;
  }

  return (
    <HomeClient
      summaries={summaries}
      latestDate={latestDate}
      sparklines={sparklinesForClient}
    />
  );
}

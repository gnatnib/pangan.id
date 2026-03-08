import { supabase } from "@/lib/supabase";
import type { Commodity, CommoditySummary, TrendPoint } from "@/lib/types";
import { HomeClient } from "./HomeClient";

export const revalidate = 3600;

async function getHomepageData() {
  const roundTo50 = (num: number) => Math.round(num / 50) * 50;

  const { data: commodities } = await supabase
    .from("commodities")
    .select("*")
    .order("id");

  if (!commodities || commodities.length === 0) {
    return { summaries: [], latestDate: new Date().toISOString().split("T")[0], sparklines: {} };
  }

  // Step 1: Get the latest available date
  const { data: latestDateRow } = await supabase
    .from("prices")
    .select("date")
    .eq("market_type", "traditional")
    .gt("price", 0)
    .order("date", { ascending: false })
    .limit(1);

  if (!latestDateRow || latestDateRow.length === 0) {
    return { summaries: [], latestDate: new Date().toISOString().split("T")[0], sparklines: {} };
  }

  const latestDate = latestDateRow[0].date;

  // Step 2: Build BI-like sparkline window from the latest 6 available update dates
  const { data: recentAverageRows } = await supabase
    .from("national_averages")
    .select("date")
    .eq("market_type", "traditional")
    .lte("date", latestDate)
    .order("date", { ascending: false })
    .limit(200);

  if (!recentAverageRows || recentAverageRows.length === 0) {
    return { summaries: [], latestDate, sparklines: {} };
  }

  const recentDatesDesc: string[] = [];
  const seenDates = new Set<string>();

  for (const row of recentAverageRows) {
    if (!seenDates.has(row.date)) {
      seenDates.add(row.date);
      recentDatesDesc.push(row.date);
    }
    if (recentDatesDesc.length === 6) break;
  }

  const sparkDates = [...recentDatesDesc].reverse();

  if (sparkDates.length === 0) {
    return { summaries: [], latestDate, sparklines: {} };
  }

  const sparkDateSet = new Set(sparkDates);
  const sparkDateIndex = new Map(sparkDates.map((date, index) => [date, index]));

  // Step 3: Fetch data in parallel using targeted queries
  const [latestPricesResult, sparklineAvgResult] = await Promise.all([
    // Latest raw prices (for min/max and province extremes) — ~714 rows
    supabase
      .from("prices")
      .select("commodity_id, province_id, price")
      .eq("market_type", "traditional")
      .eq("date", latestDate)
      .gt("price", 0),

    // National averages for the selected sparkline dates — ~126 rows
    supabase
      .from("national_averages")
      .select("commodity_id, date, avg_price")
      .eq("market_type", "traditional")
      .in("date", sparkDates)
      .gt("avg_price", 0),
  ]);

  const latestPrices = latestPricesResult.data || [];
  const sparklineRows = sparklineAvgResult.data || [];

  if (latestPrices.length === 0) {
    return { summaries: [], latestDate, sparklines: {} };
  }

  // Step 4: Group data by commodity
  const latestByCommodity = new Map<number, { price: number; province_id: string }[]>();
  for (const row of latestPrices) {
    const commodityId = Number(row.commodity_id);
    const entry = {
      price: Number(row.price),
      province_id: row.province_id,
    };

    if (!latestByCommodity.has(commodityId)) {
      latestByCommodity.set(commodityId, [entry]);
    } else {
      latestByCommodity.get(commodityId)!.push(entry);
    }
  }

  const averagesByCommodity = new Map<number, { date: string; avg_price: number }[]>();
  for (const row of sparklineRows) {
    if (!sparkDateSet.has(row.date)) continue;

    const commodityId = Number(row.commodity_id);
    const entry = {
      date: row.date,
      avg_price: Number(row.avg_price),
    };

    if (!averagesByCommodity.has(commodityId)) {
      averagesByCommodity.set(commodityId, [entry]);
    } else {
      averagesByCommodity.get(commodityId)!.push(entry);
    }
  }

  // Step 5: Build summaries and BI-like sparkline/percentage change
  const sparklines: Record<number, TrendPoint[]> = {};
  const summaries: CommoditySummary[] = [];

  for (const commodity of commodities) {
    const latestCommodityRows = latestByCommodity.get(commodity.id) || [];
    if (latestCommodityRows.length === 0) continue;

    const sparkRows = (averagesByCommodity.get(commodity.id) || [])
      .sort((a, b) => (sparkDateIndex.get(a.date)! - sparkDateIndex.get(b.date)!))
      .map((row) => ({
        date: row.date,
        price: roundTo50(row.avg_price),
      }));

    sparklines[commodity.id] = sparkRows;

    const baselinePrice = sparkRows[0]?.price ?? null;
    const latestSparkPrice = sparkRows[sparkRows.length - 1]?.price ?? null;
    const avgPrice = latestSparkPrice ?? roundTo50(
      latestCommodityRows.reduce((sum, row) => sum + row.price, 0) / latestCommodityRows.length
    );

    const priceChange = baselinePrice !== null ? avgPrice - baselinePrice : 0;
    const priceChangePct = baselinePrice && baselinePrice > 0
      ? ((avgPrice - baselinePrice) / baselinePrice) * 100
      : 0;

    const latestPricesForCommodity = latestCommodityRows.map((row) => row.price);
    const minPrice = Math.min(...latestPricesForCommodity);
    const maxPrice = Math.max(...latestPricesForCommodity);

    const sorted = [...latestCommodityRows].sort((a, b) => a.price - b.price);

    summaries.push({
      commodity: commodity as Commodity,
      avgPrice,
      prevAvgPrice: baselinePrice,
      priceChange,
      priceChangePct,
      minPrice,
      maxPrice,
      cheapestProvince: sorted[0]?.province_id || null,
      expensiveProvince: sorted[sorted.length - 1]?.province_id || null,
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

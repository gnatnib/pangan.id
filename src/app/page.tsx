import { supabase } from "@/lib/supabase";
import type { Commodity, CommoditySummary, TrendPoint } from "@/lib/types";
import { HomeClient } from "./HomeClient";

export const revalidate = 3600;

async function getHomepageData() {
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

  // Step 2: Calculate key dates
  const weekAgoDate = new Date(latestDate + "T00:00:00");
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgoStr = weekAgoDate.toISOString().split("T")[0];

  const sparkStartDate = new Date(latestDate + "T00:00:00");
  sparkStartDate.setDate(sparkStartDate.getDate() - 14);
  const sparkStartStr = sparkStartDate.toISOString().split("T")[0];

  // Step 3: Fetch data in parallel using targeted queries (each under 1000-row limit)
  const [todayResult, weekAgoResult, sparklineResult] = await Promise.all([
    // Today's raw prices (for per-province stats) — ~714 rows
    supabase
      .from("prices")
      .select("commodity_id, province_id, price")
      .eq("market_type", "traditional")
      .eq("date", latestDate)
      .gt("price", 0),

    // Week-ago raw prices (for percentage comparison) — ~714 rows
    supabase
      .from("prices")
      .select("commodity_id, province_id, price")
      .eq("market_type", "traditional")
      .eq("date", weekAgoStr)
      .gt("price", 0),

    // Sparkline data via RPC (aggregated by commodity+date) — ~210 rows
    supabase.rpc("get_sparkline_data", {
      start_date: sparkStartStr,
      end_date: latestDate,
    }),
  ]);

  const todayPrices = todayResult.data || [];
  const weekAgoPrices = weekAgoResult.data || [];
  const sparklineRows = sparklineResult.data || [];

  if (todayPrices.length === 0) {
    return { summaries: [], latestDate, sparklines: {} };
  }

  // Step 4: Build sparkline data from aggregated RPC results
  const sparklines: Record<number, TrendPoint[]> = {};
  for (const row of sparklineRows) {
    const cid = row.commodity_id;
    if (!sparklines[cid]) sparklines[cid] = [];
    sparklines[cid].push({
      date: row.date,
      price: Number(row.avg_price),
    });
  }

  // Sort sparklines chronologically
  for (const cid in sparklines) {
    sparklines[cid].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Step 5: Build summaries with PIHPS-matching weekly percentage comparison
  const roundTo50 = (num: number) => Math.round(num / 50) * 50;
  const summaries: CommoditySummary[] = [];

  for (const commodity of commodities) {
    const todayCom = todayPrices.filter((p) => p.commodity_id === commodity.id);
    if (todayCom.length === 0) continue;

    const prices = todayCom.map((p) => Number(p.price));
    const rawAvgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgPrice = roundTo50(rawAvgPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Compare vs exactly 7 days ago (matching PIHPS/BI weekly comparison)
    let prevAvgPrice: number | null = null;
    const weekAgoCom = weekAgoPrices.filter((p) => p.commodity_id === commodity.id);
    if (weekAgoCom.length > 0) {
      const rawPrevAvg = weekAgoCom.reduce((a, b) => a + Number(b.price), 0) / weekAgoCom.length;
      prevAvgPrice = roundTo50(rawPrevAvg);
    }

    const priceChange = prevAvgPrice ? avgPrice - prevAvgPrice : 0;
    const priceChangePct = prevAvgPrice ? ((avgPrice - prevAvgPrice) / prevAvgPrice) * 100 : 0;

    const sorted = [...todayCom].sort((a, b) => Number(a.price) - Number(b.price));
    summaries.push({
      commodity: commodity as Commodity,
      avgPrice,
      prevAvgPrice,
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

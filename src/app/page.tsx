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

  // To properly handle weekends/holidays, fetch the last 8 days of data
  // and extract the distinct dates available
  const todayStr = new Date().toISOString().split("T")[0];
  const daysAgo8 = new Date();
  daysAgo8.setDate(daysAgo8.getDate() - 10);
  const sparkStartStr = daysAgo8.toISOString().split("T")[0];

  const { data: weekPrices } = await supabase
    .from("prices")
    .select("commodity_id, province_id, date, price")
    .eq("market_type", "traditional")
    .gte("date", sparkStartStr)
    .lte("date", todayStr)
    .gt("price", 0)
    .order("date", { ascending: false });

  if (!weekPrices || weekPrices.length === 0) {
    return { summaries: [], latestDate: todayStr, sparklines: {} };
  }

  // Get distinct dates sorted descending
  const datesSet = new Set<string>();
  for (const p of weekPrices) {
    datesSet.add(p.date);
  }
  const sortedDates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  
  const latestDate = sortedDates[0];
  const prevDateStr = sortedDates.length > 1 ? sortedDates[1] : null;

  // Build sparkline data: commodity_id -> TrendPoint[] (daily national avg)
  // Sparkline should be chronological (ascending)
  const sparklines: Record<number, TrendPoint[]> = {};
  const byCommodityDate = new Map<string, number[]>();
  
  for (const p of weekPrices) {
    const key = `${p.commodity_id}:${p.date}`;
    if (!byCommodityDate.has(key)) byCommodityDate.set(key, []);
    byCommodityDate.get(key)!.push(p.price);
  }

  // Function to round to nearest 50
  const roundTo50 = (num: number) => Math.round(num / 50) * 50;

  // Calculate daily averages rounded to nearest 50
  for (const [key, prices] of byCommodityDate.entries()) {
    const [cid, date] = key.split(":");
    const commodityId = Number(cid);
    if (!sparklines[commodityId]) sparklines[commodityId] = [];
    
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    sparklines[commodityId].push({
      date,
      price: roundTo50(avg),
    });
  }

  // Sort sparklines chronologically
  for (const cid in sparklines) {
    sparklines[cid].sort((a, b) => a.date.localeCompare(b.date));
  }

  // Build summaries
  const summaries: CommoditySummary[] = [];
  const todayPrices = weekPrices.filter(p => p.date === latestDate);
  const prevPrices = prevDateStr ? weekPrices.filter(p => p.date === prevDateStr) : [];

  for (const commodity of commodities) {
    const todayCom = todayPrices.filter((p) => p.commodity_id === commodity.id);
    if (todayCom.length === 0) continue;

    const prices = todayCom.map((p) => p.price);
    const rawAvgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const avgPrice = roundTo50(rawAvgPrice);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    let prevAvgPrice = null;
    const sparkData = sparklines[commodity.id];
    if (sparkData && sparkData.length > 1) {
      prevAvgPrice = sparkData[0].price;
    }

    const priceChange = prevAvgPrice ? avgPrice - prevAvgPrice : 0;
    const priceChangePct = prevAvgPrice ? ((avgPrice - prevAvgPrice) / prevAvgPrice) * 100 : 0;

    const sorted = [...todayCom].sort((a, b) => a.price - b.price);
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

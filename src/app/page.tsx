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

  // Get latest date with data
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .eq("market_type", "traditional")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || new Date().toISOString().split("T")[0];
  const prevDate = new Date(latestDate + "T00:00:00");
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = prevDate.toISOString().split("T")[0];

  // Sparkline start date (7 days ago from latest)
  const sparkStart = new Date(latestDate + "T00:00:00");
  sparkStart.setDate(sparkStart.getDate() - 7);
  const sparkStartStr = sparkStart.toISOString().split("T")[0];

  // Fetch today's, yesterday's, and last 7 days' data in parallel
  const [{ data: todayPrices }, { data: prevPrices }, { data: weekPrices }] = await Promise.all([
    supabase
      .from("prices")
      .select("commodity_id, province_id, price")
      .eq("date", latestDate)
      .eq("market_type", "traditional")
      .gt("price", 0),
    supabase
      .from("prices")
      .select("commodity_id, province_id, price")
      .eq("date", prevDateStr)
      .eq("market_type", "traditional")
      .gt("price", 0),
    supabase
      .from("prices")
      .select("commodity_id, date, price")
      .eq("market_type", "traditional")
      .gte("date", sparkStartStr)
      .lte("date", latestDate)
      .gt("price", 0)
      .order("date", { ascending: true }),
  ]);

  // Build sparkline data: commodity_id -> TrendPoint[] (daily national avg)
  const sparklines: Record<number, TrendPoint[]> = {};
  if (weekPrices) {
    const byCommodityDate = new Map<string, number[]>();
    for (const p of weekPrices) {
      const key = `${p.commodity_id}:${p.date}`;
      if (!byCommodityDate.has(key)) byCommodityDate.set(key, []);
      byCommodityDate.get(key)!.push(p.price);
    }
    for (const [key, prices] of byCommodityDate.entries()) {
      const [cid, date] = key.split(":");
      const commodityId = Number(cid);
      if (!sparklines[commodityId]) sparklines[commodityId] = [];
      sparklines[commodityId].push({
        date,
        price: prices.reduce((a, b) => a + b, 0) / prices.length,
      });
    }
  }

  // Build summaries
  const summaries: CommoditySummary[] = [];
  for (const commodity of commodities) {
    const todayCom = (todayPrices || []).filter((p) => p.commodity_id === commodity.id);
    if (todayCom.length === 0) continue;

    const prices = todayCom.map((p) => p.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const prevCom = (prevPrices || []).filter((p) => p.commodity_id === commodity.id);
    let prevAvgPrice = null;
    if (prevCom.length > 0) {
      const pp = prevCom.map((p) => p.price);
      prevAvgPrice = pp.reduce((a, b) => a + b, 0) / pp.length;
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

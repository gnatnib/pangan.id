import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CommodityDetailClient } from "./CommodityDetailClient";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("commodities")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Komoditas Tidak Ditemukan" };
  return {
    title: `Harga ${data.name} Hari Ini`,
    description: `Pantau harga ${data.name} di seluruh provinsi Indonesia. Data harian dari Bank Indonesia PIHPS.`,
  };
}

export default async function CommodityDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: commodity } = await supabase
    .from("commodities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!commodity) notFound();

  // Get latest date from actual data
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .eq("commodity_id", commodity.id)
    .eq("market_type", "traditional")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || new Date().toISOString().split("T")[0];

  // 30 days ago
  const thirtyDaysAgo = new Date(latestDate + "T00:00:00");
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  // 5 days ago for multi-day table
  const fiveDaysAgo = new Date(latestDate + "T00:00:00");
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 4); // latest + 4 previous = 5 days
  const fiveDaysAgoStr = fiveDaysAgo.toISOString().split("T")[0];

  // Parallel queries
  const [
    { data: todayPrices },
    { data: trendData },
    { data: multiDayRaw },
  ] = await Promise.all([
    // Today's prices per province
    supabase
      .from("prices")
      .select("*, provinces(id, name, slug)")
      .eq("commodity_id", commodity.id)
      .eq("date", latestDate)
      .eq("market_type", "traditional")
      .gt("price", 0)
      .order("price", { ascending: true }),
    // 30-day trend (national average)
    supabase
      .from("national_averages")
      .select("date, avg_price")
      .eq("commodity_id", commodity.id)
      .eq("market_type", "traditional")
      .gte("date", thirtyDaysAgoStr)
      .order("date", { ascending: true }),
    // 5-day prices for all provinces (for the multi-day table)
    supabase
      .from("prices")
      .select("date, price, province_id, provinces(id, name, slug)")
      .eq("commodity_id", commodity.id)
      .eq("market_type", "traditional")
      .gte("date", fiveDaysAgoStr)
      .lte("date", latestDate)
      .gt("price", 0)
      .order("date", { ascending: true }),
  ]);

  // National average
  const prices = (todayPrices || []).map((p) => p.price);
  const nationalAvg = prices.length > 0
    ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
    : 0;

  const trend = (trendData || []).map((t) => ({
    date: t.date,
    price: Number(t.avg_price),
  }));

  // Extract unique dates for multi-day table header
  const multiDayDatesSet = new Set<string>();
  for (const p of multiDayRaw || []) {
    multiDayDatesSet.add(p.date);
  }
  const multiDayDates = Array.from(multiDayDatesSet).sort();

  return (
    <CommodityDetailClient
      commodity={commodity}
      todayPrices={todayPrices || []}
      nationalAvg={nationalAvg}
      trend={trend}
      latestDate={latestDate}
      multiDayPrices={multiDayRaw || []}
      multiDayDates={multiDayDates}
    />
  );
}

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

  // Get commodity
  const { data: commodity } = await supabase
    .from("commodities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!commodity) notFound();

  // Get latest date
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .eq("commodity_id", commodity.id)
    .eq("market_type", "traditional")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || new Date().toISOString().split("T")[0];

  // Get today's prices per province
  const { data: todayPrices } = await supabase
    .from("prices")
    .select("*, provinces(id, name, slug)")
    .eq("commodity_id", commodity.id)
    .eq("date", latestDate)
    .eq("market_type", "traditional")
    .gt("price", 0)
    .order("price", { ascending: true });

  // Get 90-day trend (national average)
  const ninetyDaysAgo = new Date(latestDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: trendData } = await supabase
    .from("national_averages")
    .select("date, avg_price")
    .eq("commodity_id", commodity.id)
    .eq("market_type", "traditional")
    .gte("date", ninetyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  // Calculate national average
  const prices = (todayPrices || []).map((p) => p.price);
  const nationalAvg = prices.length > 0
    ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length
    : 0;

  const trend = (trendData || []).map((t) => ({
    date: t.date,
    price: Number(t.avg_price),
  }));

  return (
    <CommodityDetailClient
      commodity={commodity}
      todayPrices={todayPrices || []}
      nationalAvg={nationalAvg}
      trend={trend}
      latestDate={latestDate}
    />
  );
}

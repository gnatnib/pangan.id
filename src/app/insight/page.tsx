import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import { InsightClient } from "./InsightClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Insight Harga Pangan",
  description:
    "Analisis otomatis perubahan harga pangan strategis di Indonesia — kenaikan, penurunan, dan disparitas harga antar provinsi.",
};

export default async function InsightPage() {
  // Get commodities and provinces for reference
  const { data: commodities } = await supabase.from("commodities").select("*");
  const { data: provinces } = await supabase.from("provinces").select("*");

  // Get latest date
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .eq("market_type", "traditional")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || new Date().toISOString().split("T")[0];

  // Get weekly changes (current vs 7 days ago national averages)
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: currentAvgs } = await supabase
    .from("national_averages")
    .select("*")
    .eq("date", latestDate)
    .eq("market_type", "traditional");

  const { data: pastAvgs } = await supabase
    .from("national_averages")
    .select("*")
    .eq("date", weekAgo.toISOString().split("T")[0])
    .eq("market_type", "traditional");

  // Get today's prices for disparity calculation
  const { data: todayPrices } = await supabase
    .from("prices")
    .select("commodity_id, province_id, price")
    .eq("date", latestDate)
    .eq("market_type", "traditional")
    .gt("price", 0);

  return (
    <InsightClient
      commodities={commodities || []}
      provinces={provinces || []}
      currentAvgs={currentAvgs || []}
      pastAvgs={pastAvgs || []}
      todayPrices={todayPrices || []}
      latestDate={latestDate}
    />
  );
}

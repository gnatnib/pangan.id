import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import { AdminClient } from "./AdminClient";

export const revalidate = 0; // No caching for admin

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: "noindex, nofollow",
};

export default async function AdminPage() {
  // Get recent scrape logs
  const { data: logs } = await supabase
    .from("scrape_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get data coverage for today
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || null;

  let coverage = { provinces: 0, commodities: 0, total: 0 };
  if (latestDate) {
    const { data: prices } = await supabase
      .from("prices")
      .select("commodity_id, province_id")
      .eq("date", latestDate)
      .eq("market_type", "traditional");

    if (prices) {
      coverage = {
        provinces: new Set(prices.map((p) => p.province_id)).size,
        commodities: new Set(prices.map((p) => p.commodity_id)).size,
        total: prices.length,
      };
    }
  }

  return (
    <AdminClient
      logs={logs || []}
      latestDate={latestDate}
      coverage={coverage}
    />
  );
}

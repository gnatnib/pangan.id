import { supabase } from "@/lib/supabase";
import { fetchPihpsCommodityTable, getDateDaysAgo } from "@/lib/pihps";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CommodityDetailClient } from "./CommodityDetailClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  const normalizeProvinceName = (value: string) =>
    value
      .toLowerCase()
      .replace(/aceh/g, "nanggroe aceh darussalam")
      .replace(/kep\./g, "kepulauan")
      .replace(/kep bangka belitung/g, "kepulauan bangka belitung")
      .replace(/di yogyakarta/g, "di yogyakarta")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const [{ data: commodity }, { data: provinces }] = await Promise.all([
    supabase
      .from("commodities")
      .select("*")
      .eq("slug", slug)
      .single(),
    supabase
      .from("provinces")
      .select("id, name, slug"),
  ]);

  if (!commodity) notFound();

  const today = new Date().toISOString().split("T")[0];
  const sourceStartDate = getDateDaysAgo(today, 30);
  const sourceTable = await fetchPihpsCommodityTable(commodity.slug, sourceStartDate, today, "traditional");

  const latestDate = sourceTable.dates[sourceTable.dates.length - 1] || today;
  const latestDateSet = new Set(sourceTable.dates);
  const latestNationalAvg = sourceTable.nationalRow?.values[latestDate] || 0;
  const nationalAvg = Math.round(latestNationalAvg / 50) * 50;
  const trend = sourceTable.dates
    .filter((date) => sourceTable.nationalRow?.values[date])
    .map((date) => ({
      date,
      price: Number(sourceTable.nationalRow?.values[date] || 0),
    }));

  const provinceMetaByName = new Map(
    (provinces || []).map((province) => [normalizeProvinceName(province.name), province])
  );

  const todayPrices = sourceTable.provinceRows
    .map((row) => {
      const provinceMeta = provinceMetaByName.get(normalizeProvinceName(row.name));
      const price = row.values[latestDate];

      if (!price) return null;

      return {
        province_id: provinceMeta?.id || row.name,
        price,
        provinces: provinceMeta
          ? { id: provinceMeta.id, name: provinceMeta.name, slug: provinceMeta.slug }
          : { id: row.name, name: row.name, slug: "" },
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.price - b.price);

  const multiDayDates = sourceTable.dates.slice(-5);
  const multiDayRaw = sourceTable.provinceRows.flatMap((row) => {
    const provinceMeta = provinceMetaByName.get(normalizeProvinceName(row.name));

    return multiDayDates
      .filter((date) => latestDateSet.has(date) && row.values[date])
      .map((date) => ({
        date,
        price: row.values[date],
        province_id: provinceMeta?.id || row.name,
        provinces: provinceMeta
          ? { id: provinceMeta.id, name: provinceMeta.name, slug: provinceMeta.slug }
          : { id: row.name, name: row.name, slug: "" },
      }));
  });

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

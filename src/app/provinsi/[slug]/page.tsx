import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import {
  formatRupiah,
  formatPrice,
  formatDateLong,
  calcPctDiff,
} from "@/lib/utils";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await supabase
    .from("provinces")
    .select("name")
    .eq("slug", slug)
    .single();

  if (!data) return { title: "Provinsi Tidak Ditemukan" };
  return {
    title: `Harga Pangan di ${data.name} Hari Ini`,
    description: `Pantau harga bahan pangan strategis di provinsi ${data.name}. Data harian dari Bank Indonesia.`,
  };
}

export default async function ProvinceDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: province } = await supabase
    .from("provinces")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!province) notFound();

  // Get latest date
  const { data: latestRow } = await supabase
    .from("prices")
    .select("date")
    .eq("province_id", province.id)
    .eq("market_type", "traditional")
    .order("date", { ascending: false })
    .limit(1);

  const latestDate = latestRow?.[0]?.date || new Date().toISOString().split("T")[0];

  // Get today's prices with commodity info
  const { data: prices } = await supabase
    .from("prices")
    .select("*, commodities(id, name, slug, unit, icon, category)")
    .eq("province_id", province.id)
    .eq("date", latestDate)
    .eq("market_type", "traditional")
    .gt("price", 0)
    .order("price", { ascending: false });

  // Get national averages for comparison
  const { data: nationalAvgs } = await supabase
    .from("national_averages")
    .select("commodity_id, avg_price")
    .eq("date", latestDate)
    .eq("market_type", "traditional");

  const nationalMap = new Map(
    (nationalAvgs || []).map((n) => [n.commodity_id, Number(n.avg_price)])
  );

  return (
    <div className="container-page py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-warm-400 mb-6">
        <Link href="/" className="hover:text-warm-600">Beranda</Link>
        <span>/</span>
        <Link href="/provinsi" className="hover:text-warm-600">Provinsi</Link>
        <span>/</span>
        <span className="text-warm-600">{province.name}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-warm-800 tracking-tight">
          {province.name}
        </h1>
        <p className="text-sm text-warm-500 mt-1">
          {formatDateLong(latestDate)} · {prices?.length || 0} komoditas · Pasar
          Tradisional
        </p>
      </div>

      {/* Price table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200">
                <th className="text-left px-4 py-3 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Komoditas
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Harga
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  Rata-rata Nasional
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-warm-400 uppercase tracking-wide">
                  vs Nasional
                </th>
              </tr>
            </thead>
            <tbody>
              {(prices || []).map((p) => {
                const natAvg = nationalMap.get(p.commodity_id);
                const vsNational = natAvg ? calcPctDiff(p.price, natAvg) : null;

                return (
                  <tr
                    key={p.id}
                    className="border-b border-warm-50 hover:bg-warm-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/komoditas/${p.commodities?.slug}`}
                        className="flex items-center gap-2 group"
                      >
                        <span>{p.commodities?.icon}</span>
                        <div>
                          <p className="font-medium text-warm-700 group-hover:text-brand-orange transition-colors">
                            {p.commodities?.name}
                          </p>
                          <p className="text-xs text-warm-400">
                            per {p.commodities?.unit}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold font-tabular text-warm-800">
                      Rp {formatPrice(p.price)}
                    </td>
                    <td className="px-4 py-3 text-right font-tabular text-warm-500">
                      {natAvg ? `Rp ${formatPrice(natAvg)}` : "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium font-tabular text-xs ${
                        vsNational !== null && vsNational > 2
                          ? "text-red-600"
                          : vsNational !== null && vsNational < -2
                          ? "text-emerald-600"
                          : "text-warm-400"
                      }`}
                    >
                      {vsNational !== null
                        ? `${vsNational > 0 ? "+" : ""}${vsNational.toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

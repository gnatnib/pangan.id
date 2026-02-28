import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Semua Provinsi",
  description: "Daftar harga pangan di seluruh 38 provinsi Indonesia.",
};

export default async function ProvinsiIndexPage() {
  const { data: provinces } = await supabase
    .from("provinces")
    .select("*")
    .order("name");

  // Group by region
  const regionMap: Record<string, string[]> = {
    Sumatera: ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"],
    Jawa: ["31", "32", "33", "34", "35", "36"],
    "Bali & Nusa Tenggara": ["51", "52", "53"],
    Kalimantan: ["61", "62", "63", "64", "65"],
    Sulawesi: ["71", "72", "73", "74", "75", "76"],
    "Maluku & Papua": ["81", "82", "91", "92", "93", "94", "95", "96"],
  };

  const getRegion = (id: string) => {
    for (const [region, ids] of Object.entries(regionMap)) {
      if (ids.includes(id)) return region;
    }
    return "Lainnya";
  };

  const grouped = new Map<string, typeof provinces>();
  for (const p of provinces || []) {
    const region = getRegion(p.id);
    if (!grouped.has(region)) grouped.set(region, []);
    grouped.get(region)!.push(p);
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-warm-800 tracking-tight mb-1">
        Provinsi
      </h1>
      <p className="text-sm text-warm-500 mb-8">
        Pantau harga pangan di {provinces?.length || 0} provinsi Indonesia
      </p>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([region, items]) => (
          <div key={region}>
            <h2 className="text-sm font-semibold text-warm-400 uppercase tracking-wide mb-3">
              {region}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items!.map((p) => (
                <Link
                  key={p.id}
                  href={`/provinsi/${p.slug}`}
                  className="card p-3 hover:-translate-y-0.5 group"
                >
                  <p className="font-semibold text-warm-700 group-hover:text-brand-orange transition-colors text-sm">
                    {p.name}
                  </p>
                  <p className="text-xs text-warm-400 mt-0.5">Kode: {p.id}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

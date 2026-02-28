import { supabase } from "@/lib/supabase";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Semua Komoditas",
  description: "Daftar lengkap komoditas pangan strategis Indonesia dengan harga terbaru.",
};

export default async function KomoditasIndexPage() {
  const { data: commodities } = await supabase
    .from("commodities")
    .select("*")
    .order("category")
    .order("name");

  // Group by category
  const grouped = new Map<string, typeof commodities>();
  for (const c of commodities || []) {
    const cat = c.category || "Lainnya";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(c);
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-warm-800 tracking-tight mb-1">
        Komoditas Pangan
      </h1>
      <p className="text-sm text-warm-500 mb-8">
        {commodities?.length || 0} komoditas strategis yang dipantau
      </p>

      <div className="space-y-8">
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-warm-400 uppercase tracking-wide mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items!.map((c) => (
                <Link
                  key={c.id}
                  href={`/komoditas/${c.slug}`}
                  className="card p-4 hover:-translate-y-0.5 flex items-center gap-3 group"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <div>
                    <p className="font-semibold text-warm-700 group-hover:text-brand-orange transition-colors text-sm">
                      {c.name}
                    </p>
                    <p className="text-xs text-warm-400">
                      {c.name_en} · per {c.unit}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

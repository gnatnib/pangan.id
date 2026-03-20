import { cache } from "react";

export const PIHPS_BASE_URL = "https://www.bi.go.id/hargapangan";

const MARKET_TYPE_TO_ID = {
  traditional: "1",
  modern: "2",
} as const;

const SLUG_TO_BI_ID: Record<string, string> = {
  "beras-kualitas-bawah-i": "com_1",
  "beras-kualitas-bawah-ii": "com_2",
  "beras-kualitas-medium-i": "com_3",
  "beras-kualitas-medium-ii": "com_4",
  "beras-kualitas-super-i": "com_5",
  "beras-kualitas-super-ii": "com_6",
  "daging-ayam-ras-segar": "com_7",
  "daging-sapi-kualitas-1": "com_8",
  "daging-sapi-kualitas-2": "com_9",
  "telur-ayam-ras-segar": "com_10",
  "bawang-merah-ukuran-sedang": "com_11",
  "bawang-putih-ukuran-sedang": "com_12",
  "cabai-merah-besar": "com_13",
  "cabai-merah-keriting": "com_14",
  "cabai-rawit-hijau": "com_15",
  "cabai-rawit-merah": "com_16",
  "minyak-goreng-curah": "com_17",
  "minyak-goreng-kemasan-bermerek-1": "com_18",
  "minyak-goreng-kemasan-bermerek-2": "com_19",
  "gula-pasir-kualitas-premium": "com_20",
  "gula-pasir-lokal": "com_21",
};

type PihpsMarketType = keyof typeof MARKET_TYPE_TO_ID;

export interface PihpsCommodityRow {
  no?: string;
  name: string;
  level: number;
  values: Record<string, number>;
}

export interface PihpsCommodityTable {
  slug: string;
  marketType: PihpsMarketType;
  dates: string[];
  nationalRow: PihpsCommodityRow | null;
  provinceRows: PihpsCommodityRow[];
}

function parsePrice(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str || str === "-" || str === "0") return null;
  const num = Number(str.replace(/\./g, "").replace(/,/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parseDateKey(key: string): string | null {
  const match = key.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, dd, mm, yyyy] = match;
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateForPihps(date: string): string {
  return date;
}

export function getDateDaysAgo(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00`);
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

export const fetchPihpsCommodityTable = cache(
  async (
    slug: string,
    startDate: string,
    endDate: string,
    marketType: PihpsMarketType = "traditional"
  ): Promise<PihpsCommodityTable> => {
    const biId = SLUG_TO_BI_ID[slug];
    if (!biId) {
      throw new Error(`Unknown BI commodity mapping for slug: ${slug}`);
    }

    const params = new URLSearchParams({
      price_type_id: MARKET_TYPE_TO_ID[marketType],
      comcat_id: biId,
      province_id: "",
      regency_id: "",
      showKota: "false",
      showPasar: "false",
      tipe_laporan: "1",
      start_date: formatDateForPihps(startDate),
      end_date: formatDateForPihps(endDate),
    });

    const response = await fetch(`${PIHPS_BASE_URL}/WebSite/TabelHarga/GetGridDataKomoditas?${params.toString()}`, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${PIHPS_BASE_URL}/TabelHarga/PasarTradisionalKomoditas`,
        "User-Agent": "Mozilla/5.0 (compatible; Pangan.id/1.0)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`PIHPS request failed for ${slug}: ${response.status}`);
    }

    const payload = (await response.json()) as { data?: Array<Record<string, unknown>> };
    const rawRows = payload.data || [];
    const dates = new Set<string>();

    const rows: PihpsCommodityRow[] = rawRows.map((row) => {
      const values: Record<string, number> = {};

      for (const [key, rawValue] of Object.entries(row)) {
        const isoDate = parseDateKey(key);
        if (!isoDate) continue;
        const parsedPrice = parsePrice(rawValue);
        if (parsedPrice === null) continue;
        values[isoDate] = parsedPrice;
        dates.add(isoDate);
      }

      return {
        no: typeof row.no === "string" ? row.no : undefined,
        name: typeof row.name === "string" ? row.name.trim() : "",
        level: Number(row.level ?? 0),
        values,
      };
    });

    return {
      slug,
      marketType,
      dates: Array.from(dates).sort(),
      nationalRow: rows.find((row) => row.level === 0 || row.name === "Semua Provinsi") || null,
      provinceRows: rows.filter((row) => row.level === 1),
    };
  }
);

import { serverSupabase } from "@/lib/server-supabase";

type ClientChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatCompletionRole = "system" | "user" | "assistant" | "tool";

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type ChatCompletionMessage = {
  role: ChatCompletionRole;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: ChatCompletionMessage;
  }>;
  error?: {
    message?: string;
  };
};

type OllamaToolCall = {
  function: {
    name: string;
    arguments?: Record<string, unknown>;
  };
};

type OllamaChatMessage = {
  role: ChatCompletionRole;
  content: string;
  tool_name?: string;
  tool_calls?: OllamaToolCall[];
};

type OllamaChatResponse = {
  message?: {
    role?: "assistant";
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  error?: string;
};

type CommodityRef = {
  id: number;
  name: string;
  slug: string;
  unit: string;
  category: string | null;
};

type ProvinceRef = {
  id: string;
  name: string;
  slug: string;
};

type ReferenceData = {
  commodities: CommodityRef[];
  provinces: ProvinceRef[];
};

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties: boolean;
    };
  };
};

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || process.env.AI_MODEL || "qwen3.5:397b";
const DEFAULT_OPENAI_BASE_URL = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const DEFAULT_OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || "https://ollama.com").replace(/\/$/, "");
const SYSTEM_PROMPT = [
  "Kamu adalah Pangan.id AI, asisten analisis harga pangan Indonesia.",
  "Jawab hanya dalam scope harga bahan pangan, komoditas, provinsi, tren, perbandingan, dan data yang berasal dari Pangan.id / Bank Indonesia PIHPS.",
  "Selalu gunakan tool saat menyebut angka, peringkat, harga, tanggal, kenaikan, atau penurunan.",
  "Jika pertanyaan di luar scope pangan atau butuh data yang tidak tersedia, tolak dengan sopan dan arahkan kembali ke topik harga pangan.",
  "Jawab dalam Bahasa Indonesia yang ringkas, jelas, dan praktis.",
  "Jika ada gap tanggal karena akhir pekan atau hari tanpa update, jelaskan secara singkat bila relevan.",
].join(" ");

const PROVINCE_ALIASES: Record<string, string> = {
  "diy": "di yogyakarta",
  "jogja": "di yogyakarta",
  "yogya": "di yogyakarta",
  "semarang": "jawa tengah",
  "jepara": "jawa tengah",
  "sabang": "nanggroe aceh darussalam",
  "subulussalam": "nanggroe aceh darussalam",
  "pekalongan": "jawa tengah",
  "tegal": "jawa tengah",
  "purwokerto": "jawa tengah",
  "magelang": "jawa tengah",
  "salatiga": "jawa tengah",
  "cilacap": "jawa tengah",
  "kudus": "jawa tengah",
  "pati": "jawa tengah",
  "solo": "jawa tengah",
  "surakarta": "jawa tengah",
  "bandung": "jawa barat",
  "garut": "jawa barat",
  "tasikmalaya": "jawa barat",
  "sukabumi": "jawa barat",
  "cianjur": "jawa barat",
  "bogor": "jawa barat",
  "bekasi": "jawa barat",
  "cirebon": "jawa barat",
  "surabaya": "jawa timur",
  "malang": "jawa timur",
  "kediri": "jawa timur",
  "ngawi": "jawa timur",
  "nganjuk": "jawa timur",
  "madiun": "jawa timur",
  "jember": "jawa timur",
  "bojonegoro": "jawa timur",
  "lamongan": "jawa timur",
  "mojokerto": "jawa timur",
  "sidoarjo": "jawa timur",
  "pasuruan": "jawa timur",
  "probolinggo": "jawa timur",
  "blitar": "jawa timur",
  "jakarta": "dki jakarta",
  "tangerang": "banten",
  "serang": "banten",
  "cilegon": "banten",
  "aceh": "nanggroe aceh darussalam",
  "medan": "sumatera utara",
  "padang": "sumatera barat",
  "pekanbaru": "riau",
  "jambi": "jambi",
  "palembang": "sumatera selatan",
  "lampung": "lampung",
  "bandar lampung": "lampung",
  "bandarlampung": "lampung",
  "pontianak": "kalimantan barat",
  "palangkaraya": "kalimantan tengah",
  "banjarmasin": "kalimantan selatan",
  "samarinda": "kalimantan timur",
  "balikpapan": "kalimantan timur",
  "manado": "sulawesi utara",
  "makassar": "sulawesi selatan",
  "kendari": "sulawesi tenggara",
  "gorontalo": "gorontalo",
  "denpasar": "bali",
  "mataram": "nusa tenggara barat",
  "kupang": "nusa tenggara timur",
  "ambon": "maluku",
  "ternate": "maluku utara",
  "jayapura": "papua",
  "sorong": "papua barat daya",
};

const FOOD_SCOPE_KEYWORDS = [
  "pangan",
  "harga",
  "komoditas",
  "bahan pangan",
  "bahan pokok",
  "sembako",
  "provinsi",
  "nasional",
  "pasar",
  "naik",
  "turun",
  "termurah",
  "termahal",
  "murah",
  "mahal",
  "tren",
  "trend",
  "historis",
  "riwayat",
  "cabai",
  "cabe",
  "ayam",
  "sapi",
  "beras",
  "telur",
  "daging",
  "gula",
  "minyak",
  "bawang",
  "rawit",
  "merah",
  "hijau",
];

const OUT_OF_SCOPE_PATTERNS = [
  "siapa namaku",
  "siapa nama saya",
  "siapa aku",
  "namaku siapa",
  "nama saya siapa",
  "kamu tahu nama saya",
  "siapa presiden",
  "berapa umurku",
  "berapa umur saya",
  "siapa pacarku",
];

const QUERY_STOPWORDS = new Set([
  "berapa",
  "harga",
  "di",
  "yang",
  "untuk",
  "dan",
  "atau",
  "dengan",
  "dalam",
  "pada",
  "apa",
  "ada",
  "kah",
  "itu",
  "ini",
  "hari",
  "terakhir",
  "nasional",
  "provinsi",
  "pasar",
  "rata",
  "rata",
  "berapa",
  "bahan",
  "pangan",
  "komoditas",
]);

const GROUP_TOKENS = new Set([
  "cabai",
  "cabe",
  "rawit",
  "merah",
  "hijau",
  "daging",
  "ayam",
  "sapi",
  "telur",
  "beras",
  "gula",
  "pasir",
  "minyak",
  "goreng",
  "bawang",
  "putih",
  "lokal",
  "premium",
  "kualitas",
  "curah",
  "kemasan",
  "bermerek",
  "super",
  "medium",
  "bawah",
  "segar",
  "keriting",
  "besar",
  "1",
  "2",
  "i",
  "ii",
]);

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "get_site_overview",
      description: "Ambil ringkasan data pangan terbaru secara nasional.",
      parameters: {
        type: "object",
        properties: {
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_top_movers",
      description: "Cari komoditas dengan kenaikan atau penurunan terbesar pada periode tertentu, nasional atau per provinsi.",
      parameters: {
        type: "object",
        properties: {
          days: {
            type: "number",
            description: "Jumlah hari kalender ke belakang dari tanggal update terakhir.",
          },
          direction: {
            type: "string",
            enum: ["up", "down"],
            description: "Naik atau turun.",
          },
          limit: {
            type: "number",
            description: "Jumlah hasil yang diinginkan.",
          },
          province_query: {
            type: "string",
            description: "Nama provinsi bila ingin analisis per provinsi.",
          },
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        required: ["days", "direction"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_latest_prices_in_province",
      description: "Ambil komoditas termurah atau termahal di satu provinsi pada tanggal update terakhir.",
      parameters: {
        type: "object",
        properties: {
          province_query: {
            type: "string",
            description: "Nama provinsi, misalnya Jogja atau Jawa Barat.",
          },
          direction: {
            type: "string",
            enum: ["cheapest", "most_expensive"],
            description: "Urutkan dari termurah atau termahal.",
          },
          limit: {
            type: "number",
            description: "Jumlah hasil.",
          },
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        required: ["province_query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_latest_price",
      description: "Ambil harga terbaru untuk satu komoditas, bisa nasional atau di satu provinsi.",
      parameters: {
        type: "object",
        properties: {
          commodity_query: {
            type: "string",
            description: "Nama komoditas yang dicari.",
          },
          province_query: {
            type: "string",
            description: "Nama provinsi jika ingin harga provinsi tertentu.",
          },
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        required: ["commodity_query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_commodity_history",
      description: "Ambil riwayat harga satu komoditas untuk beberapa hari terakhir, nasional atau per provinsi.",
      parameters: {
        type: "object",
        properties: {
          commodity_query: {
            type: "string",
            description: "Nama komoditas yang dicari.",
          },
          days: {
            type: "number",
            description: "Jumlah hari kalender ke belakang dari update terakhir.",
          },
          province_query: {
            type: "string",
            description: "Nama provinsi bila ingin histori per provinsi.",
          },
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        required: ["commodity_query", "days"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_commodity_across_provinces",
      description: "Bandingkan harga satu komoditas di seluruh provinsi pada update terakhir untuk mencari yang termurah atau termahal.",
      parameters: {
        type: "object",
        properties: {
          commodity_query: {
            type: "string",
            description: "Nama komoditas yang dicari.",
          },
          direction: {
            type: "string",
            enum: ["cheapest", "most_expensive"],
            description: "Cari provinsi termurah atau termahal.",
          },
          limit: {
            type: "number",
            description: "Jumlah hasil.",
          },
          market_type: {
            type: "string",
            enum: ["traditional", "modern"],
            description: "Jenis pasar yang ingin dipakai.",
          },
        },
        required: ["commodity_query"],
        additionalProperties: false,
      },
    },
  },
];

let referenceCache: (ReferenceData & { expiresAt: number }) | null = null;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bcabe\b/g, "cabai")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function roundTo50(value: number): number {
  return Math.round(value / 50) * 50;
}

function formatRupiah(value: number): string {
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

function formatSignedRupiah(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${formatRupiah(Math.abs(value))}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(2).replace(".", ",")}%`;
}

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "tanggal tidak tersedia";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

function daysAgoFrom(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(Math.max(Math.round(value), min), max);
}

function getMarketType(value: unknown): "traditional" | "modern" {
  return value === "modern" ? "modern" : "traditional";
}

function getDirection(value: unknown, fallback: "up" | "down"): "up" | "down" {
  return value === "down" ? "down" : fallback;
}

function getPriceDirection(value: unknown, fallback: "cheapest" | "most_expensive"): "cheapest" | "most_expensive" {
  return value === "most_expensive" ? "most_expensive" : fallback;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function extractMeaningfulTokens(question: string, province: ProvinceRef | null): string[] {
  const normalizedQuestion = normalizeText(question);
  const provinceTokens = new Set<string>();

  if (province) {
    for (const token of normalizeText(province.name).split(" ")) {
      if (token) provinceTokens.add(token);
    }
    for (const token of normalizeText(province.slug.replace(/-/g, " ")).split(" ")) {
      if (token) provinceTokens.add(token);
    }

    for (const [alias, canonical] of Object.entries(PROVINCE_ALIASES)) {
      if (normalizeText(canonical) === normalizeText(province.name)) {
        for (const token of normalizeText(alias).split(" ")) {
          if (token) provinceTokens.add(token);
        }
      }
    }
  }

  return normalizedQuestion
    .split(" ")
    .filter((token) => token.length > 1)
    .filter((token) => !QUERY_STOPWORDS.has(token))
    .filter((token) => !provinceTokens.has(token));
}

function removeProvinceAliases(text: string): string {
  let result = normalizeText(text);

  for (const alias of Object.keys(PROVINCE_ALIASES)) {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) continue;
    const pattern = new RegExp(`\\b${normalizedAlias.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "g");
    result = result.replace(pattern, " ");
  }

  return result.replace(/\s+/g, " ").trim();
}

function extractLocationQuery(question: string): string | null {
  const normalized = normalizeText(question);
  const match = normalized.match(/\bdi\s+([a-z0-9 ]+)$/);
  if (!match?.[1]) return null;

  return match[1].trim();
}

function removeTrailingLocationPhrase(text: string): string {
  return normalizeText(text).replace(/\bdi\s+[a-z0-9 ]+$/g, "").trim();
}

function getCommodityCandidates(
  question: string,
  commodities: CommodityRef[],
  province: ProvinceRef | null
): CommodityRef[] {
  const tokens = extractMeaningfulTokens(question, province);
  if (tokens.length === 0) return [];

  const scored = commodities
    .map((commodity) => {
      const haystack = `${normalizeText(commodity.name)} ${normalizeText(commodity.slug.replace(/-/g, " "))}`;
      const matchedTokens = tokens.filter((token) => haystack.includes(token));

      return {
        commodity,
        matchedCount: matchedTokens.length,
        exactPhrase: tokens.join(" "),
        haystack,
      };
    })
    .filter((entry) => entry.matchedCount > 0)
    .sort((a, b) => {
      const aExact = a.haystack.includes(a.exactPhrase) ? 1 : 0;
      const bExact = b.haystack.includes(b.exactPhrase) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
      return a.commodity.name.length - b.commodity.name.length;
    });

  const bestScore = scored[0]?.matchedCount ?? 0;
  return scored
    .filter((entry) => entry.matchedCount === bestScore)
    .map((entry) => entry.commodity);
}

function analyzeCommodityCandidates(
  question: string,
  commodities: CommodityRef[],
  province: ProvinceRef | null
) {
  const tokens = extractMeaningfulTokens(question, province);
  const candidates = getCommodityCandidates(question, commodities, province);
  const matchedTokens = new Set<string>();

  for (const candidate of candidates) {
    const haystack = `${normalizeText(candidate.name)} ${normalizeText(candidate.slug.replace(/-/g, " "))}`;
    for (const token of tokens) {
      if (haystack.includes(token)) {
        matchedTokens.add(token);
      }
    }
  }

  const unmatchedTokens = tokens.filter((token) => !matchedTokens.has(token));
  const unsupportedTokens = unmatchedTokens.filter((token) => !GROUP_TOKENS.has(token));

  return {
    tokens,
    candidates,
    matchedTokens: Array.from(matchedTokens),
    unmatchedTokens,
    unsupportedTokens,
  };
}

function getCommodityGroupLabel(
  question: string,
  candidates: CommodityRef[],
  province: ProvinceRef | null
): string {
  const tokens = extractMeaningfulTokens(question, province);
  if (tokens.length > 0) {
    return capitalizeWords(tokens.join(" "));
  }

  return candidates[0]?.name || "komoditas ini";
}

function hasExplicitFoodIntent(normalized: string): boolean {
  return [
    "harga",
    "berapa",
    "naik",
    "turun",
    "termurah",
    "termahal",
    "murah",
    "mahal",
    "provinsi",
    "tren",
    "trend",
    "riwayat",
    "historis",
    "perubahan",
    "banding",
  ].some((keyword) => normalized.includes(keyword));
}

function hasVariantHint(normalized: string): boolean {
  return [
    "premium",
    "lokal",
    "merah",
    "hijau",
    "super",
    "medium",
    "bawah",
    "kualitas",
    "1",
    "2",
    "i",
    "ii",
  ].some((keyword) => normalized.includes(keyword));
}

async function buildContextualQuestion(history: ClientChatMessage[]): Promise<string> {
  const userMessages = history.filter((message) => message.role === "user" && message.content.trim());
  const current = userMessages[userMessages.length - 1]?.content.trim() || "";
  const previous = userMessages[userMessages.length - 2]?.content.trim() || "";

  if (!current || !previous) return current;

  const normalizedCurrent = normalizeText(current);
  const normalizedPrevious = normalizeText(previous);
  const { commodities, provinces } = await getReferenceData();
  const currentProvince = findMentionedItem(provinces, current, PROVINCE_ALIASES);
  const previousProvince =
    findMentionedItem(provinces, previous, PROVINCE_ALIASES) ||
    [...userMessages]
      .slice(0, -1)
      .reverse()
      .map((message) => findMentionedItem(provinces, message.content, PROVINCE_ALIASES))
      .find(Boolean) ||
    null;
  const currentCommodityCandidates = getCommodityCandidates(current, commodities, currentProvince);
  const previousCommodityCandidates = getCommodityCandidates(previous, commodities, previousProvince);
  const previousCommodityGroupLabel = getCommodityGroupLabel(previous, previousCommodityCandidates, previousProvince);
  const previousLooksLikePriceContext =
    normalizedPrevious.includes("harga") ||
    normalizedPrevious.includes("berapa") ||
    normalizedPrevious.startsWith("kalau ") ||
    normalizedPrevious.startsWith("kalo ") ||
    normalizedPrevious.startsWith("yang ") ||
    previousCommodityCandidates.length > 0;

  const shortFollowUp =
    normalizedCurrent.startsWith("kalau ") ||
    normalizedCurrent.startsWith("kalo ") ||
    normalizedCurrent.startsWith("yang ") ||
    normalizedCurrent.startsWith("bagaimana kalau ") ||
    normalizedCurrent === "nasional" ||
    (!hasExplicitFoodIntent(normalizedCurrent) && normalizedCurrent.split(" ").length <= 5) ||
    (hasVariantHint(normalizedCurrent) && normalizedCurrent.split(" ").length <= 5) ||
    (!hasExplicitFoodIntent(normalizedCurrent) && currentCommodityCandidates.length > 0 && normalizedCurrent.split(" ").length <= 4);

  if (!shortFollowUp) return current;

  let merged = current
    .replace(/^kalau\s+/i, "")
    .replace(/^kalo\s+/i, "")
    .replace(/^yang\s+/i, "")
    .replace(/^bagaimana kalau\s+/i, "")
    .replace(/[?!.,]+$/g, "")
    .trim();

  if (normalizedCurrent === "nasional" || normalizedCurrent === "kalau nasional") {
    merged = `berapa harga ${previousCommodityGroupLabel} nasional`;
    return merged.trim();
  }

  if (hasVariantHint(normalizedCurrent) && previousCommodityCandidates.length > 0 && !currentCommodityCandidates.length) {
    merged = `${previousCommodityGroupLabel} ${merged}`.trim();
  }

  if (!hasExplicitFoodIntent(normalizedCurrent) && (previousLooksLikePriceContext || currentCommodityCandidates.length > 0)) {
    merged = merged.startsWith("berapa harga ") ? merged : `berapa harga ${merged}`;
  }

  if (normalizedCurrent.includes("nasional")) {
    merged = merged.replace(/\s+di\s+.+$/i, "").trim();
    if (!merged.includes("nasional")) {
      merged = `${merged} nasional`.trim();
    }
  } else if (!currentProvince && previousProvince) {
    merged = `${merged} di ${previousProvince.name}`;
  }

  return merged.trim();
}

async function getReferenceData(): Promise<ReferenceData> {
  if (referenceCache && referenceCache.expiresAt > Date.now()) {
    return {
      commodities: referenceCache.commodities,
      provinces: referenceCache.provinces,
    };
  }

  const [{ data: commodities }, { data: provinces }] = await Promise.all([
    serverSupabase.from("commodities").select("id, name, slug, unit, category").order("name"),
    serverSupabase.from("provinces").select("id, name, slug").order("name"),
  ]);

  referenceCache = {
    commodities: (commodities || []) as CommodityRef[],
    provinces: (provinces || []) as ProvinceRef[],
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  return {
    commodities: referenceCache.commodities,
    provinces: referenceCache.provinces,
  };
}

function findMentionedItem<T extends { name: string; slug: string }>(
  items: T[],
  rawQuestion: string,
  aliases?: Record<string, string>
): T | null {
  const question = normalizeText(rawQuestion);

  for (const [alias, canonical] of Object.entries(aliases || {})) {
    if (question.includes(normalizeText(alias))) {
      const matched = findBestMatch(items, canonical, aliases);
      if (matched) return matched;
    }
  }

  let bestMatch: T | null = null;
  let bestLength = 0;

  for (const item of items) {
    const candidates = [normalizeText(item.name), normalizeText(item.slug.replace(/-/g, " "))];
    for (const candidate of candidates) {
      if (candidate && question.includes(candidate) && candidate.length > bestLength) {
        bestMatch = item;
        bestLength = candidate.length;
      }
    }
  }

  return bestMatch;
}

function findBestMatch<T extends { name: string; slug: string }>(
  items: T[],
  rawQuery: string,
  aliases?: Record<string, string>
): T | null {
  const query = normalizeText(rawQuery);
  const aliasQuery = aliases?.[query] ? normalizeText(aliases[query]) : query;

  let bestItem: T | null = null;
  let bestScore = 0;

  for (const item of items) {
    const name = normalizeText(item.name);
    const slug = normalizeText(item.slug.replace(/-/g, " "));
    const haystack = `${name} ${slug}`;

    let score = 0;
    if (name === aliasQuery || slug === aliasQuery) score = 100;
    else if (name.startsWith(aliasQuery) || slug.startsWith(aliasQuery)) score = 85;
    else if (haystack.includes(aliasQuery)) score = 70;
    else {
      const tokens = aliasQuery.split(" ").filter(Boolean);
      if (tokens.length > 0 && tokens.every((token) => haystack.includes(token))) {
        score = 60;
      }
    }

    if (score > bestScore) {
      bestItem = item;
      bestScore = score;
    }
  }

  return bestScore >= 60 ? bestItem : null;
}

async function resolveProvince(query: string): Promise<ProvinceRef | null> {
  const { provinces } = await getReferenceData();
  return findBestMatch(provinces, query, PROVINCE_ALIASES);
}

async function resolveCommodity(query: string): Promise<CommodityRef | null> {
  const { commodities } = await getReferenceData();
  return findBestMatch(commodities, query);
}

async function getLatestNationalDate(marketType: "traditional" | "modern"): Promise<string | null> {
  const { data } = await serverSupabase
    .from("national_averages")
    .select("date")
    .eq("market_type", marketType)
    .order("date", { ascending: false })
    .limit(1);

  return data?.[0]?.date || null;
}

async function getLatestProvinceDate(
  provinceId: string,
  marketType: "traditional" | "modern"
): Promise<string | null> {
  const { data } = await serverSupabase
    .from("prices")
    .select("date")
    .eq("province_id", provinceId)
    .eq("market_type", marketType)
    .order("date", { ascending: false })
    .limit(1);

  return data?.[0]?.date || null;
}

async function getSiteOverview(args: Record<string, unknown>) {
  const marketType = getMarketType(args.market_type);
  const latestDate = await getLatestNationalDate(marketType);
  const { commodities, provinces } = await getReferenceData();

  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const { data: averages } = await serverSupabase
    .from("national_averages")
    .select("commodity_id, avg_price")
    .eq("market_type", marketType)
    .eq("date", latestDate)
    .gt("avg_price", 0);

  const commodityMap = new Map(commodities.map((item) => [item.id, item]));
  const sample = (averages || []).slice(0, 5).map((row) => ({
    commodity: commodityMap.get(Number(row.commodity_id))?.name || `Komoditas ${row.commodity_id}`,
    avg_price: roundTo50(Number(row.avg_price)),
  }));

  return {
    ok: true,
    market_type: marketType,
    latest_date: latestDate,
    tracked_commodities: commodities.length,
    tracked_provinces: provinces.length,
    sample_prices: sample,
  };
}

async function getTopMovers(args: Record<string, unknown>) {
  const marketType = getMarketType(args.market_type);
  const direction = getDirection(args.direction, "up");
  const days = clampNumber(args.days, 30, 1, 180);
  const limit = clampNumber(args.limit, 5, 1, 10);
  const provinceQuery = getString(args.province_query);
  const { commodities } = await getReferenceData();
  const commodityMap = new Map(commodities.map((item) => [item.id, item]));

  if (provinceQuery) {
    const province = await resolveProvince(provinceQuery);
    if (!province) {
      return { ok: false, message: `Provinsi \"${provinceQuery}\" tidak ditemukan.` };
    }

    const latestDate = await getLatestProvinceDate(province.id, marketType);
    if (!latestDate) {
      return { ok: false, message: `Belum ada data untuk ${province.name}.` };
    }

    const startDate = daysAgoFrom(latestDate, days);
    const { data } = await serverSupabase
      .from("prices")
      .select("commodity_id, date, price")
      .eq("province_id", province.id)
      .eq("market_type", marketType)
      .gte("date", startDate)
      .lte("date", latestDate)
      .gt("price", 0)
      .order("date", { ascending: true });

    const grouped = new Map<number, Array<{ date: string; price: number }>>();
    for (const row of data || []) {
      const commodityId = Number(row.commodity_id);
      const entry = { date: row.date, price: Number(row.price) };
      if (!grouped.has(commodityId)) grouped.set(commodityId, [entry]);
      else grouped.get(commodityId)?.push(entry);
    }

    const results = Array.from(grouped.entries())
      .map(([commodityId, rows]) => {
        const first = rows[0];
        const last = rows[rows.length - 1];
        const priceChange = last.price - first.price;
        const priceChangePct = first.price > 0 ? (priceChange / first.price) * 100 : 0;

        return {
          commodity: commodityMap.get(commodityId)?.name || `Komoditas ${commodityId}`,
          start_date: first.date,
          end_date: last.date,
          start_price: roundTo50(first.price),
          end_price: roundTo50(last.price),
          change: roundTo50(priceChange),
          change_pct: Number(priceChangePct.toFixed(2)),
          observed_points: rows.length,
        };
      })
      .filter((item) => (direction === "up" ? item.change > 0 : item.change < 0))
      .sort((a, b) =>
        direction === "up" ? b.change_pct - a.change_pct : a.change_pct - b.change_pct
      )
      .slice(0, limit);

    return {
      ok: true,
      scope: "province",
      province: province.name,
      market_type: marketType,
      latest_date: latestDate,
      requested_days: days,
      results,
    };
  }

  const latestDate = await getLatestNationalDate(marketType);
  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const startDate = daysAgoFrom(latestDate, days);
  const { data } = await serverSupabase
    .from("national_averages")
    .select("commodity_id, date, avg_price")
    .eq("market_type", marketType)
    .gte("date", startDate)
    .lte("date", latestDate)
    .gt("avg_price", 0)
    .order("date", { ascending: true });

  const grouped = new Map<number, Array<{ date: string; price: number }>>();
  for (const row of data || []) {
    const commodityId = Number(row.commodity_id);
    const entry = { date: row.date, price: Number(row.avg_price) };
    if (!grouped.has(commodityId)) grouped.set(commodityId, [entry]);
    else grouped.get(commodityId)?.push(entry);
  }

  const results = Array.from(grouped.entries())
    .map(([commodityId, rows]) => {
      const first = rows[0];
      const last = rows[rows.length - 1];
      const startPrice = roundTo50(first.price);
      const endPrice = roundTo50(last.price);
      const priceChange = endPrice - startPrice;
      const priceChangePct = startPrice > 0 ? (priceChange / startPrice) * 100 : 0;

      return {
        commodity: commodityMap.get(commodityId)?.name || `Komoditas ${commodityId}`,
        start_date: first.date,
        end_date: last.date,
        start_price: startPrice,
        end_price: endPrice,
        change: priceChange,
        change_pct: Number(priceChangePct.toFixed(2)),
        observed_points: rows.length,
      };
    })
    .filter((item) => (direction === "up" ? item.change > 0 : item.change < 0))
    .sort((a, b) =>
      direction === "up" ? b.change_pct - a.change_pct : a.change_pct - b.change_pct
    )
    .slice(0, limit);

  return {
    ok: true,
    scope: "national",
    market_type: marketType,
    latest_date: latestDate,
    requested_days: days,
    results,
  };
}

async function getLatestPricesInProvince(args: Record<string, unknown>) {
  const provinceQuery = getString(args.province_query);
  if (!provinceQuery) {
    return { ok: false, message: "Nama provinsi wajib diisi." };
  }

  const marketType = getMarketType(args.market_type);
  const direction = getPriceDirection(args.direction, "cheapest");
  const limit = clampNumber(args.limit, 5, 1, 10);
  const province = await resolveProvince(provinceQuery);
  if (!province) {
    return { ok: false, message: `Provinsi \"${provinceQuery}\" tidak ditemukan.` };
  }

  const latestDate = await getLatestProvinceDate(province.id, marketType);
  if (!latestDate) {
    return { ok: false, message: `Belum ada data untuk ${province.name}.` };
  }

  const { commodities } = await getReferenceData();
  const commodityMap = new Map(commodities.map((item) => [item.id, item]));

  const { data } = await serverSupabase
    .from("prices")
    .select("commodity_id, price")
    .eq("province_id", province.id)
    .eq("date", latestDate)
    .eq("market_type", marketType)
    .gt("price", 0);

  const results = (data || [])
    .map((row) => ({
      commodity: commodityMap.get(Number(row.commodity_id))?.name || `Komoditas ${row.commodity_id}`,
      unit: commodityMap.get(Number(row.commodity_id))?.unit || "Kg",
      price: roundTo50(Number(row.price)),
    }))
    .sort((a, b) =>
      direction === "cheapest" ? a.price - b.price : b.price - a.price
    )
    .slice(0, limit);

  return {
    ok: true,
    province: province.name,
    market_type: marketType,
    latest_date: latestDate,
    direction,
    results,
  };
}

async function getLatestNationalPrices(args: Record<string, unknown>) {
  const marketType = getMarketType(args.market_type);
  const direction = getPriceDirection(args.direction, "cheapest");
  const limit = clampNumber(args.limit, 5, 1, 10);
  const latestDate = await getLatestNationalDate(marketType);

  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const { commodities } = await getReferenceData();
  const commodityMap = new Map(commodities.map((item) => [item.id, item]));

  const { data } = await serverSupabase
    .from("national_averages")
    .select("commodity_id, avg_price")
    .eq("date", latestDate)
    .eq("market_type", marketType)
    .gt("avg_price", 0);

  const results = (data || [])
    .map((row) => ({
      commodity: commodityMap.get(Number(row.commodity_id))?.name || `Komoditas ${row.commodity_id}`,
      unit: commodityMap.get(Number(row.commodity_id))?.unit || "Kg",
      price: roundTo50(Number(row.avg_price)),
    }))
    .sort((a, b) =>
      direction === "cheapest" ? a.price - b.price : b.price - a.price
    )
    .slice(0, limit);

  return {
    ok: true,
    latest_date: latestDate,
    market_type: marketType,
    direction,
    results,
  };
}

async function getLatestPricesForCommodityMatches(args: {
  commodity_ids: number[];
  province?: ProvinceRef | null;
  market_type?: "traditional" | "modern";
}) {
  const marketType = args.market_type || "traditional";
  const commodityIds = Array.from(new Set(args.commodity_ids)).filter((id) => Number.isFinite(id));

  if (commodityIds.length === 0) {
    return { ok: false, message: "Komoditas yang dimaksud belum berhasil diidentifikasi." };
  }

  const { commodities } = await getReferenceData();
  const commodityMap = new Map(commodities.map((item) => [item.id, item]));

  if (args.province) {
    const latestDate = await getLatestProvinceDate(args.province.id, marketType);
    if (!latestDate) {
      return { ok: false, message: `Belum ada data untuk ${args.province.name}.` };
    }

    const { data } = await serverSupabase
      .from("prices")
      .select("commodity_id, price")
      .eq("province_id", args.province.id)
      .eq("market_type", marketType)
      .eq("date", latestDate)
      .in("commodity_id", commodityIds)
      .gt("price", 0);

    return {
      ok: true,
      scope: "province",
      province: args.province.name,
      latest_date: latestDate,
      results: (data || [])
        .map((row) => ({
          commodity: commodityMap.get(Number(row.commodity_id))?.name || `Komoditas ${row.commodity_id}`,
          unit: commodityMap.get(Number(row.commodity_id))?.unit || "Kg",
          price: roundTo50(Number(row.price)),
        }))
        .sort((a, b) => a.price - b.price),
    };
  }

  const latestDate = await getLatestNationalDate(marketType);
  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const { data } = await serverSupabase
    .from("national_averages")
    .select("commodity_id, avg_price")
    .eq("market_type", marketType)
    .eq("date", latestDate)
    .in("commodity_id", commodityIds)
    .gt("avg_price", 0);

  return {
    ok: true,
    scope: "national",
    latest_date: latestDate,
    results: (data || [])
      .map((row) => ({
        commodity: commodityMap.get(Number(row.commodity_id))?.name || `Komoditas ${row.commodity_id}`,
        unit: commodityMap.get(Number(row.commodity_id))?.unit || "Kg",
        price: roundTo50(Number(row.avg_price)),
      }))
      .sort((a, b) => a.price - b.price),
  };
}

function buildUnsupportedCommodityReply(rawQuestion: string, unsupportedTokens: string[], province: ProvinceRef | null): string {
  const normalized = normalizeText(rawQuestion);
  const unsupportedLabel = capitalizeWords(unsupportedTokens.join(" "));

  if (normalized.includes("minyak")) {
    return `Saya tidak menemukan komoditas ${unsupportedLabel.toLowerCase() || "tersebut"} di data Pangan.id. Untuk kategori minyak, yang tersedia hanya minyak goreng seperti Minyak Goreng Curah, Minyak Goreng Kemasan Bermerek 1, dan Minyak Goreng Kemasan Bermerek 2${province ? ` di ${province.name}` : ""}.`;
  }

  if (normalized.includes("daging")) {
    return `Saya tidak menemukan komoditas ${unsupportedLabel.toLowerCase() || "tersebut"} di data Pangan.id. Untuk kategori daging, yang tersedia saat ini hanya Daging Ayam Ras Segar, Daging Sapi Kualitas 1, dan Daging Sapi Kualitas 2${province ? ` di ${province.name}` : ""}.`;
  }

  if (normalized.includes("mi") || normalized.includes("mie")) {
    return "Pangan.id tidak melacak makanan olahan seperti mi ayam. Saya hanya bisa bantu untuk komoditas pangan yang ada di dataset, seperti beras, cabai, gula, minyak goreng, telur, daging ayam, dan daging sapi.";
  }

  return `Saya tidak menemukan komoditas ${unsupportedLabel.toLowerCase() || "tersebut"} di data Pangan.id. Coba tanya komoditas yang memang dilacak, seperti beras, cabai, gula, minyak goreng, telur, daging ayam, atau daging sapi.`;
}

async function getLatestPrice(args: Record<string, unknown>) {
  const commodityQuery = getString(args.commodity_query);
  if (!commodityQuery) {
    return { ok: false, message: "Nama komoditas wajib diisi." };
  }

  const marketType = getMarketType(args.market_type);
  const provinceQuery = getString(args.province_query);
  const commodity = await resolveCommodity(commodityQuery);
  if (!commodity) {
    return { ok: false, message: `Komoditas \"${commodityQuery}\" tidak ditemukan.` };
  }

  if (provinceQuery) {
    const province = await resolveProvince(provinceQuery);
    if (!province) {
      return { ok: false, message: `Provinsi \"${provinceQuery}\" tidak ditemukan.` };
    }

    const latestDate = await getLatestProvinceDate(province.id, marketType);
    if (!latestDate) {
      return { ok: false, message: `Belum ada data untuk ${province.name}.` };
    }

    const { data } = await serverSupabase
      .from("prices")
      .select("price")
      .eq("commodity_id", commodity.id)
      .eq("province_id", province.id)
      .eq("date", latestDate)
      .eq("market_type", marketType)
      .gt("price", 0)
      .limit(1);

    if (!data?.[0]) {
      return {
        ok: false,
        message: `Tidak ada harga ${commodity.name} di ${province.name} pada ${latestDate}.`,
      };
    }

    return {
      ok: true,
      scope: "province",
      province: province.name,
      commodity: commodity.name,
      unit: commodity.unit,
      market_type: marketType,
      latest_date: latestDate,
      price: roundTo50(Number(data[0].price)),
    };
  }

  const latestDate = await getLatestNationalDate(marketType);
  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const { data } = await serverSupabase
    .from("national_averages")
    .select("avg_price")
    .eq("commodity_id", commodity.id)
    .eq("date", latestDate)
    .eq("market_type", marketType)
    .gt("avg_price", 0)
    .limit(1);

  if (!data?.[0]) {
    return {
      ok: false,
      message: `Tidak ada harga nasional terbaru untuk ${commodity.name}.`,
    };
  }

  return {
    ok: true,
    scope: "national",
    commodity: commodity.name,
    unit: commodity.unit,
    market_type: marketType,
    latest_date: latestDate,
    price: roundTo50(Number(data[0].avg_price)),
  };
}

async function getCommodityHistory(args: Record<string, unknown>) {
  const commodityQuery = getString(args.commodity_query);
  if (!commodityQuery) {
    return { ok: false, message: "Nama komoditas wajib diisi." };
  }

  const days = clampNumber(args.days, 30, 1, 180);
  const marketType = getMarketType(args.market_type);
  const provinceQuery = getString(args.province_query);
  const commodity = await resolveCommodity(commodityQuery);
  if (!commodity) {
    return { ok: false, message: `Komoditas \"${commodityQuery}\" tidak ditemukan.` };
  }

  if (provinceQuery) {
    const province = await resolveProvince(provinceQuery);
    if (!province) {
      return { ok: false, message: `Provinsi \"${provinceQuery}\" tidak ditemukan.` };
    }

    const latestDate = await getLatestProvinceDate(province.id, marketType);
    if (!latestDate) {
      return { ok: false, message: `Belum ada data untuk ${province.name}.` };
    }

    const startDate = daysAgoFrom(latestDate, days);
    const { data } = await serverSupabase
      .from("prices")
      .select("date, price")
      .eq("commodity_id", commodity.id)
      .eq("province_id", province.id)
      .eq("market_type", marketType)
      .gte("date", startDate)
      .lte("date", latestDate)
      .gt("price", 0)
      .order("date", { ascending: true });

    const points = (data || []).map((row) => ({
      date: row.date,
      price: roundTo50(Number(row.price)),
    }));

    if (points.length === 0) {
      return {
        ok: false,
        message: `Tidak ada histori ${commodity.name} di ${province.name} untuk periode tersebut.`,
      };
    }

    const first = points[0];
    const last = points[points.length - 1];
    const change = last.price - first.price;
    const changePct = first.price > 0 ? (change / first.price) * 100 : 0;

    return {
      ok: true,
      scope: "province",
      province: province.name,
      commodity: commodity.name,
      unit: commodity.unit,
      market_type: marketType,
      start_date: first.date,
      end_date: last.date,
      change,
      change_pct: Number(changePct.toFixed(2)),
      points,
    };
  }

  const latestDate = await getLatestNationalDate(marketType);
  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const startDate = daysAgoFrom(latestDate, days);
  const { data } = await serverSupabase
    .from("national_averages")
    .select("date, avg_price")
    .eq("commodity_id", commodity.id)
    .eq("market_type", marketType)
    .gte("date", startDate)
    .lte("date", latestDate)
    .gt("avg_price", 0)
    .order("date", { ascending: true });

  const points = (data || []).map((row) => ({
    date: row.date,
    price: roundTo50(Number(row.avg_price)),
  }));

  if (points.length === 0) {
    return { ok: false, message: `Tidak ada histori nasional untuk ${commodity.name}.` };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const change = last.price - first.price;
  const changePct = first.price > 0 ? (change / first.price) * 100 : 0;

  return {
    ok: true,
    scope: "national",
    commodity: commodity.name,
    unit: commodity.unit,
    market_type: marketType,
    start_date: first.date,
    end_date: last.date,
    change,
    change_pct: Number(changePct.toFixed(2)),
    points,
  };
}

async function compareCommodityAcrossProvinces(args: Record<string, unknown>) {
  const commodityQuery = getString(args.commodity_query);
  if (!commodityQuery) {
    return { ok: false, message: "Nama komoditas wajib diisi." };
  }

  const marketType = getMarketType(args.market_type);
  const direction = getPriceDirection(args.direction, "cheapest");
  const limit = clampNumber(args.limit, 5, 1, 10);
  const commodity = await resolveCommodity(commodityQuery);
  if (!commodity) {
    return { ok: false, message: `Komoditas \"${commodityQuery}\" tidak ditemukan.` };
  }

  const latestDate = await getLatestNationalDate(marketType);
  if (!latestDate) {
    return { ok: false, message: "Belum ada data nasional yang tersedia." };
  }

  const { provinces } = await getReferenceData();
  const provinceMap = new Map(provinces.map((item) => [item.id, item]));

  const { data } = await serverSupabase
    .from("prices")
    .select("province_id, price")
    .eq("commodity_id", commodity.id)
    .eq("date", latestDate)
    .eq("market_type", marketType)
    .gt("price", 0);

  const results = (data || [])
    .map((row) => ({
      province: provinceMap.get(row.province_id)?.name || row.province_id,
      price: roundTo50(Number(row.price)),
      unit: commodity.unit,
    }))
    .sort((a, b) =>
      direction === "cheapest" ? a.price - b.price : b.price - a.price
    )
    .slice(0, limit);

  return {
    ok: true,
    commodity: commodity.name,
    market_type: marketType,
    latest_date: latestDate,
    direction,
    results,
  };
}

async function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_site_overview":
      return getSiteOverview(args);
    case "get_top_movers":
      return getTopMovers(args);
    case "get_latest_prices_in_province":
      return getLatestPricesInProvince(args);
    case "get_latest_price":
      return getLatestPrice(args);
    case "get_commodity_history":
      return getCommodityHistory(args);
    case "compare_commodity_across_provinces":
      return compareCommodityAcrossProvinces(args);
    default:
      return { ok: false, message: `Tool ${name} tidak dikenali.` };
  }
}

function getAiProvider(): "ollama" | "openai" {
  if (process.env.OLLAMA_API_KEY) return "ollama";
  return "openai";
}

async function createOpenAiChatCompletion(messages: ChatCompletionMessage[]) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured.");
  }

  const response = await fetch(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      messages,
      tools: TOOL_DEFINITIONS,
    }),
  });

  const data = (await response.json()) as ChatCompletionResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to call AI provider.");
  }

  return data;
}

async function createOllamaChatCompletion(messages: OllamaChatMessage[]) {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) {
    throw new Error("OLLAMA_API_KEY is not configured.");
  }

  const response = await fetch(`${DEFAULT_OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      tools: TOOL_DEFINITIONS,
      stream: false,
      think: false,
      options: {
        temperature: 0.2,
      },
    }),
  });

  const data = (await response.json()) as OllamaChatResponse;
  if (!response.ok) {
    throw new Error(data.error || "Failed to call Ollama.");
  }

  return data;
}

function extractRequestedDays(question: string): number {
  const match = question.match(/(\d+)\s*hari/);
  return match ? clampNumber(Number(match[1]), 30, 1, 180) : 30;
}

function isClearlyOutOfScopeQuestion(normalized: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function hasFoodScopeSignals(normalized: string, commodity: CommodityRef | null, province: ProvinceRef | null): boolean {
  if (commodity || province) return true;
  return FOOD_SCOPE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function canUseDeterministicReply(question: string): boolean {
  const normalized = normalizeText(question);

  return (
    isClearlyOutOfScopeQuestion(normalized) ||
    FOOD_SCOPE_KEYWORDS.some((keyword) => normalized.includes(normalizeText(keyword))) ||
    normalized.includes("naik") ||
    normalized.includes("turun") ||
    (normalized.includes("naik") && normalized.includes("tinggi")) ||
    ((normalized.includes("turun") || normalized.includes("penurunan")) && normalized.includes("tinggi")) ||
    normalized.includes("provinsi mana") ||
    normalized.includes("provinsi apa") ||
    normalized.includes("termurah") ||
    normalized.includes("termahal") ||
    normalized.includes("murah") ||
    normalized.includes("mahal") ||
    normalized.includes("paling murah") ||
    normalized.includes("paling mahal") ||
    normalized.includes("harga") ||
    normalized.includes("berapa harga") ||
    normalized.includes("harga bahan pangan") ||
    normalized.includes("komoditas apa") ||
    normalized.includes("bahan pangan apa") ||
    normalized.includes("riwayat") ||
    normalized.includes("historis") ||
    normalized.includes("perubahan") ||
    normalized.includes("trend") ||
    normalized.includes("tren")
  );
}

async function generateFallbackReply(question: string): Promise<string> {
  const normalized = normalizeText(question);
  const { commodities, provinces } = await getReferenceData();
  const commodity = findMentionedItem(commodities, question);
  const locationQuery = extractLocationQuery(question);
  const province =
    findMentionedItem(provinces, question, PROVINCE_ALIASES) ||
    (locationQuery ? await resolveProvince(locationQuery) : null);
  const questionWithoutProvinceAliases = removeTrailingLocationPhrase(removeProvinceAliases(question));
  const commodityAnalysis = analyzeCommodityCandidates(questionWithoutProvinceAliases, commodities, province);
  const commodityCandidates = commodityAnalysis.candidates;
  const inferredCommodity = commodity || (commodityCandidates.length === 1 ? commodityCandidates[0] : null);
  const commodityGroupLabel = getCommodityGroupLabel(questionWithoutProvinceAliases, commodityCandidates, province);
  const hasFoodSignals = hasFoodScopeSignals(normalized, inferredCommodity, province);

  if (isClearlyOutOfScopeQuestion(normalized) || !hasFoodSignals) {
    return "Maaf, saya hanya bisa membantu pertanyaan seputar harga pangan, komoditas, provinsi, dan tren data di Pangan.id.";
  }

  if (locationQuery && !province && (inferredCommodity || commodityCandidates.length > 0 || normalized.includes("harga"))) {
    return `Saya belum mengenali lokasi \"${capitalizeWords(locationQuery)}\" di dataset wilayah saya. Coba gunakan nama provinsi, atau kota/kabupaten yang lebih umum dikenali.`;
  }

  if (commodityAnalysis.unsupportedTokens.length > 0 && commodityCandidates.length === 0) {
    return buildUnsupportedCommodityReply(questionWithoutProvinceAliases, commodityAnalysis.unsupportedTokens, province);
  }

  if (commodityAnalysis.unsupportedTokens.length > 0 && commodityCandidates.length > 0) {
    return buildUnsupportedCommodityReply(questionWithoutProvinceAliases, commodityAnalysis.unsupportedTokens, province);
  }

  if (normalized.includes("naik") && normalized.includes("tinggi")) {
    const result = await getTopMovers({
      days: extractRequestedDays(question),
      direction: "up",
      province_query: province?.name,
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil data kenaikan komoditas.";
    const top = result.results?.[0];
    if (!top) {
      return `Saya tidak menemukan komoditas yang naik pada periode tersebut${result.scope === "province" ? ` di ${result.province}` : ""}.`;
    }

    return `${result.scope === "province" ? `Di ${result.province}` : "Secara nasional"}, komoditas dengan kenaikan tertinggi ${result.requested_days} hari terakhir adalah ${top.commodity}. Harganya naik dari ${formatRupiah(top.start_price)} menjadi ${formatRupiah(top.end_price)} pada ${formatDateDisplay(top.end_date)} (${formatPercent(top.change_pct)} atau ${formatSignedRupiah(top.change)}).`;
  }

  if ((normalized.includes("turun") || normalized.includes("penurunan")) && normalized.includes("tinggi")) {
    const result = await getTopMovers({
      days: extractRequestedDays(question),
      direction: "down",
      province_query: province?.name,
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil data penurunan komoditas.";
    const top = result.results?.[0];
    if (!top) {
      return `Saya tidak menemukan komoditas yang turun pada periode tersebut${result.scope === "province" ? ` di ${result.province}` : ""}.`;
    }

    return `${result.scope === "province" ? `Di ${result.province}` : "Secara nasional"}, komoditas dengan penurunan terbesar ${result.requested_days} hari terakhir adalah ${top.commodity}. Harganya berubah dari ${formatRupiah(top.start_price)} menjadi ${formatRupiah(top.end_price)} pada ${formatDateDisplay(top.end_date)} (${formatPercent(top.change_pct)} atau ${formatSignedRupiah(top.change)}).`;
  }

  if ((normalized.includes("provinsi mana") || normalized.includes("provinsi apa")) && inferredCommodity) {
    const direction = normalized.includes("mahal") ? "most_expensive" : "cheapest";
    const result = await compareCommodityAcrossProvinces({
      commodity_query: inferredCommodity.name,
      direction,
      limit: 1,
    });

    if (!result.ok) return result.message || "Saya belum bisa membandingkan harga antar provinsi.";
    const top = result.results?.[0];
    if (!top) {
      return `Saya belum menemukan data lintas provinsi untuk ${inferredCommodity.name}.`;
    }

    return `Pada ${formatDateDisplay(result.latest_date)}, ${inferredCommodity.name} ${direction === "cheapest" ? "paling murah" : "paling mahal"} ada di ${top.province} dengan harga ${formatRupiah(top.price)}/${top.unit}.`;
  }

  if (province && (normalized.includes("termurah") || normalized.includes("termahal"))) {
    const direction = normalized.includes("termahal") ? "most_expensive" : "cheapest";
    const result = await getLatestPricesInProvince({
      province_query: province.name,
      direction,
      limit: 1,
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil data harga provinsi tersebut.";
    const top = result.results?.[0];
    if (!top) {
      return `Saya belum menemukan data harga terbaru untuk ${province.name}.`;
    }

    return `Pada ${formatDateDisplay(result.latest_date)}, komoditas ${direction === "cheapest" ? "termurah" : "termahal"} di ${result.province} adalah ${top.commodity} dengan harga ${formatRupiah(top.price)}/${top.unit}.`;
  }

  if (normalized.includes("termurah") || normalized.includes("termahal") || normalized.includes("paling murah") || normalized.includes("paling mahal")) {
    const direction = normalized.includes("mahal") ? "most_expensive" : "cheapest";

    if (inferredCommodity) {
      const result = await compareCommodityAcrossProvinces({
        commodity_query: inferredCommodity.name,
        direction,
        limit: 5,
      });

      if (!result.ok) return result.message || "Saya belum bisa membandingkan harga komoditas itu antar provinsi.";
      const top = result.results?.[0];
      if (!top) {
        return `Saya belum menemukan data per provinsi untuk ${inferredCommodity.name}.`;
      }

      return `Pada ${formatDateDisplay(result.latest_date)}, ${inferredCommodity.name} ${direction === "cheapest" ? "paling murah" : "paling mahal"} ada di ${top.province} dengan harga ${formatRupiah(top.price)}/${top.unit}.`;
    }

    const result = await getLatestNationalPrices({ direction, limit: 5 });
    if (!result.ok) return result.message || "Saya belum bisa mengambil daftar harga nasional terbaru.";
    const top = result.results?.[0];
    if (!top) {
      return "Saya belum menemukan daftar harga nasional terbaru.";
    }

    return `Pada ${formatDateDisplay(result.latest_date)}, komoditas ${direction === "cheapest" ? "termurah" : "termahal"} secara nasional adalah ${top.commodity} dengan harga rata-rata ${formatRupiah(top.price)}/${top.unit}.`;
  }

  if ((normalized.includes("berapa harga") || normalized.includes("harga")) && inferredCommodity) {
    const result = await getLatestPrice({
      commodity_query: inferredCommodity.name,
      province_query: province?.name,
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil harga terbaru komoditas tersebut.";

    if (result.scope === "province") {
      return `Harga terbaru ${result.commodity} di ${result.province} pada ${formatDateDisplay(result.latest_date)} adalah ${formatRupiah(result.price ?? 0)}/${result.unit}.`;
    }

    return `Harga rata-rata nasional ${result.commodity} pada ${formatDateDisplay(result.latest_date)} adalah ${formatRupiah(result.price ?? 0)}/${result.unit}.`;
  }

  if ((normalized.includes("berapa harga") || normalized.includes("harga")) && commodityCandidates.length > 1) {
    const result = await getLatestPricesForCommodityMatches({
      commodity_ids: commodityCandidates.map((item) => item.id),
      province,
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil daftar harga komoditas yang kamu maksud.";

    const results = (result.results || []).slice(0, 8);
    if (results.length === 0) {
      return `Saya belum menemukan daftar harga untuk kelompok ${commodityGroupLabel}${province ? ` di ${province.name}` : ""}.`;
    }

    const intro = province
      ? `${commodityGroupLabel} yang mana? Untuk ${province.name}, pada ${formatDateDisplay(result.latest_date)} ada beberapa jenis berikut:`
      : `${commodityGroupLabel} yang mana? Untuk rata-rata nasional pada ${formatDateDisplay(result.latest_date)} ada beberapa jenis berikut:`;
    const lines = results.map(
      (item, index) => `${index + 1}. ${item.commodity}: ${formatRupiah(item.price)}/${item.unit}`
    );

    return `${intro}\n\n${lines.join("\n")}\n\nAda jenis ${commodityGroupLabel.toLowerCase()} tertentu yang ingin kamu tanyakan?`;
  }

  if ((normalized.includes("naik") || normalized.includes("turun") || normalized.includes("perubahan")) && inferredCommodity) {
    const result = await getCommodityHistory({
      commodity_query: inferredCommodity.name,
      province_query: province?.name,
      days: extractRequestedDays(question),
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil perubahan harga komoditas tersebut.";

    const directionLabel = (result.change ?? 0) > 0 ? "naik" : (result.change ?? 0) < 0 ? "turun" : "stabil";
    const points = result.points || [];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    return `${inferredCommodity.name}${result.scope === "province" ? ` di ${result.province}` : " secara nasional"} ${directionLabel} dari ${formatRupiah(firstPoint?.price ?? 0)} menjadi ${formatRupiah(lastPoint?.price ?? 0)}/${result.unit} pada periode ${formatDateDisplay(result.start_date)} sampai ${formatDateDisplay(result.end_date)} (${formatPercent(result.change_pct ?? 0)}).`;
  }

  if ((normalized.includes("riwayat") || normalized.includes("historis") || normalized.includes("trend") || normalized.includes("tren")) && inferredCommodity) {
    const result = await getCommodityHistory({
      commodity_query: inferredCommodity.name,
      province_query: province?.name,
      days: extractRequestedDays(question),
    });

    if (!result.ok) return result.message || "Saya belum bisa mengambil histori komoditas tersebut.";

    const points = result.points || [];
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    if (!firstPoint || !lastPoint) {
      return `Saya belum menemukan histori harga untuk ${inferredCommodity.name}${result.scope === "province" ? ` di ${result.province}` : ""}.`;
    }

    return `Untuk ${inferredCommodity.name}${result.scope === "province" ? ` di ${result.province}` : " secara nasional"}, periode ${formatDateDisplay(result.start_date)} sampai ${formatDateDisplay(result.end_date)} bergerak dari ${formatRupiah(firstPoint.price ?? 0)} menjadi ${formatRupiah(lastPoint.price ?? 0)}/${result.unit} (${formatPercent(result.change_pct ?? 0)} atau ${formatSignedRupiah(result.change ?? 0)}).`;
  }

  if (commodityCandidates.length > 1) {
    return `Saya menemukan beberapa jenis untuk ${commodityGroupLabel}. Coba perjelas salah satunya, misalnya ${commodityCandidates.slice(0, 3).map((item) => item.name).join(", ")}.`;
  }

  if (inferredCommodity || province) {
    return "Saya bisa bantu, tapi pertanyaannya masih kurang spesifik. Coba sebutkan yang ingin dicari: harga terbaru, perubahan 7/30 hari, komoditas termurah/termahal, atau perbandingan antar provinsi.";
  }

  return "Saya bisa bantu analisis harga pangan, tapi perlu detail yang lebih jelas. Misalnya: komoditas apa, provinsi mana, dan periode berapa hari yang ingin dibandingkan.";
}

function sanitizeHistory(messages: ClientChatMessage[]): ClientChatMessage[] {
  return messages
    .filter((message) => (message.role === "user" || message.role === "assistant") && message.content.trim())
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }));
}

export async function generateFoodChatReply(history: ClientChatMessage[]): Promise<string> {
  const cleanedHistory = sanitizeHistory(history);
  const lastUserMessage = [...cleanedHistory].reverse().find((message) => message.role === "user")?.content || "";
  const contextualQuestion = await buildContextualQuestion(cleanedHistory);
  const provider = getAiProvider();

  if (contextualQuestion && canUseDeterministicReply(contextualQuestion)) {
    return generateFallbackReply(contextualQuestion);
  }

  const contextualizedHistory = [...cleanedHistory];
  for (let index = contextualizedHistory.length - 1; index >= 0; index -= 1) {
    if (contextualizedHistory[index].role === "user") {
      contextualizedHistory[index] = {
        ...contextualizedHistory[index],
        content: contextualQuestion || lastUserMessage,
      };
      break;
    }
  }

  if (provider === "ollama") {
    try {
      const messages: OllamaChatMessage[] = [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...contextualizedHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ];

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const completion = await createOllamaChatCompletion(messages);
        const assistantMessage = completion.message;

        if (!assistantMessage) {
          throw new Error("Ollama returned an empty response.");
        }

        const toolCalls = assistantMessage.tool_calls || [];
        if (toolCalls.length > 0) {
          messages.push({
            role: "assistant",
            content: assistantMessage.content || "",
            tool_calls: toolCalls,
          });

          for (const toolCall of toolCalls) {
            const args = toolCall.function.arguments || {};
            const result = await executeTool(toolCall.function.name, args);
            messages.push({
              role: "tool",
              tool_name: toolCall.function.name,
              content: JSON.stringify(result),
            });
          }

          continue;
        }

        return assistantMessage.content?.trim() || "Maaf, saya belum bisa menyusun jawaban untuk pertanyaan itu.";
      }

      throw new Error("AI chat exceeded tool-calling limit.");
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("unauthorized") || message.includes("api key") || message.includes("ollama")) {
        return generateFallbackReply(lastUserMessage);
      }

      throw error;
    }
  }

  try {
    const messages: ChatCompletionMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      ...contextualizedHistory.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const completion = await createOpenAiChatCompletion(messages);
      const assistantMessage = completion.choices?.[0]?.message;

      if (!assistantMessage) {
        throw new Error("AI provider returned an empty response.");
      }

      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        messages.push({
          role: "assistant",
          content: assistantMessage.content,
          tool_calls: assistantMessage.tool_calls,
        });

        for (const toolCall of assistantMessage.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }

          const result = await executeTool(toolCall.function.name, args);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        continue;
      }

      return assistantMessage.content?.trim() || "Maaf, saya belum bisa menyusun jawaban untuk pertanyaan itu.";
    }

    throw new Error("AI chat exceeded tool-calling limit.");
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("unauthorized") || message.includes("api key") || message.includes("failed to call ai provider")) {
      return generateFallbackReply(lastUserMessage);
    }

    throw error;
  }
}

// Database types for Pangan.id

export interface Province {
  id: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
}

export interface Commodity {
  id: number;
  name: string;
  name_en: string | null;
  slug: string;
  unit: string;
  category: string | null;
  icon: string | null;
}

export interface Price {
  id: number;
  commodity_id: number;
  province_id: string;
  price: number;
  price_change: number | null;
  price_change_pct: number | null;
  market_type: string;
  date: string;
  source: string;
}

export interface PriceWithDetails extends Price {
  commodities?: Commodity;
  provinces?: Province;
}

export interface NationalAverage {
  commodity_id: number;
  date: string;
  market_type: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  province_count: number;
}

export interface ScrapeLog {
  id: number;
  scrape_date: string;
  source: string;
  status: string;
  commodities_scraped: number | null;
  provinces_scraped: number | null;
  rows_inserted: number | null;
  error_message: string | null;
  duration_seconds: number | null;
  created_at: string;
}

// Aggregated types for the frontend
export interface CommoditySummary {
  commodity: Commodity;
  avgPrice: number;
  prevAvgPrice: number | null;
  priceChange: number;
  priceChangePct: number;
  minPrice: number;
  maxPrice: number;
  cheapestProvince: string | null;
  expensiveProvince: string | null;
}

export interface ProvincePrice {
  province: Province;
  price: number;
  priceChange: number | null;
  priceChangePct: number | null;
  vsNationalAvg: number | null;
}

export interface TrendPoint {
  date: string;
  price: number;
}

export interface Insight {
  id: string;
  type: "increase" | "decrease" | "disparity" | "record";
  title: string;
  description: string;
  value: number;
  unit: string;
  commodity?: string;
  commoditySlug?: string;
  province?: string;
  provinceSlug?: string;
  icon: string;
}

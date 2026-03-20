import { NextResponse } from "next/server";
import { fetchPihpsCommodityTable } from "@/lib/pihps";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!slug || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing slug, startDate, or endDate." }, { status: 400 });
    }

    const table = await fetchPihpsCommodityTable(slug, startDate, endDate, "traditional");

    const rows = table.provinceRows
      .map((row) => {
        const prices = table.dates
          .filter((date) => date >= startDate && date <= endDate)
          .map((date) => row.values[date])
          .filter((price): price is number => typeof price === "number" && price > 0);

        if (prices.length === 0) return null;

        return {
          provinceName: row.name,
          averagePrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.averagePrice - b.averagePrice);

    const nationalPoints = table.dates
      .filter((date) => date >= startDate && date <= endDate)
      .map((date) => table.nationalRow?.values[date])
      .filter((price): price is number => typeof price === "number" && price > 0);

    const nationalAverage = nationalPoints.length > 0
      ? Math.round(nationalPoints.reduce((sum, price) => sum + price, 0) / nationalPoints.length)
      : 0;

    return NextResponse.json({
      latestDate: table.dates[table.dates.length - 1] || endDate,
      nationalAverage,
      rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

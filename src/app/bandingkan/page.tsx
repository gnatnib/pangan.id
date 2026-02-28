import { supabase } from "@/lib/supabase";
import type { Metadata } from "next";
import { BandingkanClient } from "./BandingkanClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Bandingkan Harga",
  description: "Bandingkan harga pangan antar provinsi di Indonesia.",
};

export default async function BandingkanPage() {
  const { data: commodities } = await supabase
    .from("commodities")
    .select("*")
    .order("name");

  const { data: provinces } = await supabase
    .from("provinces")
    .select("*")
    .order("name");

  return (
    <BandingkanClient
      commodities={commodities || []}
      provinces={provinces || []}
    />
  );
}

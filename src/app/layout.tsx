import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://pangan-id.vercel.app"),
  title: {
    default: "Pangan.id — Harga Pangan Indonesia Hari Ini",
    template: "%s — Pangan.id",
  },
  description:
    "Pantau harga bahan pangan strategis di seluruh Indonesia. Data harian dari Bank Indonesia untuk beras, cabai, daging, telur, dan komoditas pangan lainnya.",
  keywords: [
    "harga pangan",
    "harga beras",
    "harga cabai",
    "harga daging",
    "harga telur",
    "harga pangan Indonesia",
    "PIHPS",
    "Bank Indonesia",
  ],
  icons: {
    icon: [
      { url: "/favicon_io/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon_io/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon_io/favicon.ico",
    apple: "/favicon_io/apple-touch-icon.png",
  },
  manifest: "/favicon_io/site.webmanifest",
  openGraph: {
  title: "Pangan.id — Harga Pangan Indonesia Hari Ini",
  description:
    "Pantau harga bahan pangan strategis di seluruh Indonesia. Data harian dari Bank Indonesia.",
  type: "website",
  locale: "id_ID",
  siteName: "Pangan.id",
  url: "https://pangan-id.vercel.app",
  images: [
    {
      url: "/homelogopanganid.png",
      width: 1200,
      height: 630,
      alt: "Pangan.id",
    },
  ],
},
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={plusJakarta.variable}>
      <body>
        <Navbar />
        <main className="min-h-screen pt-16">{children}</main>
        <footer className="border-t border-warm-200 py-8 mt-16">
          <div className="container-page text-center text-sm text-warm-500">
            <p>
              &copy; {new Date().getFullYear()} Pangan.id — Data dari{" "}
              <a
                href="https://www.bi.go.id/hargapangan"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-warm-700"
              >
                Bank Indonesia PIHPS
              </a>
            </p>
            <p className="mt-1 text-warm-400">
              Pemantauan harga pangan strategis untuk seluruh Indonesia
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

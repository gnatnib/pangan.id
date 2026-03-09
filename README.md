<p align="center">
  <img src="https://raw.githubusercontent.com/gnatnib/pangan.id/main/public/homelogopanganid.png" 
       alt="Pangan.id" 
       height="96" />
</p>

<h3 align="center">Pangan.id</h3>

<p align="center">
  <a href="https://pangan-id.vercel.app">Website</a> ·
  <a href="https://pangan-id.vercel.app/tentang">Tentang</a> ·
  <a href="https://www.bi.go.id/hargapangan">Sumber Data</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Data-Bank_Indonesia_PIHPS-005BAA?style=flat" alt="Data by Bank Indonesia" />
  <img src="https://img.shields.io/badge/Built_with-Claude_Opus_4.6-cc785c?style=flat&logo=anthropic&logoColor=white" alt="Built with Claude Opus 4.6" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-000000?logo=vercel" alt="Vercel" />
</p>

---

## The Problem

**270 million Indonesians** depend on basic food commodities, yet have no practical way to monitor their prices. The official government monitoring site ([panelharga.badanpangan.go.id](https://panelharga.badanpangan.go.id)) suffers from poor UX, slow load times, and no trend or comparison features. When prices spike, consumers and policymakers have no quick, accessible reference point.

## What Pangan.id Does

Pangan.id scrapes daily price data from **Bank Indonesia PIHPS** — the most reliable and consistently updated public food price source in Indonesia and presents it as a fast, mobile-friendly dashboard with trends, provincial comparisons, an interactive map, and a scoped AI assistant for natural-language food price queries.

No login. No paywall. No ads. Just data.

## Try It Now

Browse real-time food prices across all 38 Indonesian provinces:

**[pangan-id.vercel.app](https://pangan-id.vercel.app)**

Or check a specific commodity:
> [/komoditas/cabai-rawit-merah](https://pangan-id.vercel.app/komoditas/cabai-rawit-merah) — Harga Cabai Rawit Merah hari ini di semua provinsi

> [/provinsi/jawa-barat](https://pangan-id.vercel.app/provinsi/jawa-barat) — Semua harga pangan di Jawa Barat

## What We Built

| | Feature | Description |
|---|---|---|
| **📊** | National Overview | Daily national average prices for 21 commodities with % change indicators |
| **📈** | Price Trends | Latest/7/30-day sparklines and full trend charts per commodity |
| **🗺️** | Interactive Map | SVG choropleth map of Indonesia colored by price level per province |
| **🏙️** | Province Detail | All commodity prices per province with vs-national-average comparison |
| **🌶️** | Commodity Detail | Price history, province ranking table, cheapest/most expensive highlights |
| **💬** | Pai (Pangan AI) | Homepage chat assistant for natural-language questions like top movers, cheapest commodity in a province, or price follow-ups |
| **🔄** | Auto-Update | GitHub Actions scraper runs at 09:00 and 17:00 WIB daily |
| **💡** | Auto Insights | SQL-generated price alerts plus scoped AI chat with deterministic data fallback |
| **📱** | Mobile-First | Designed for mobile, fast on low-end devices and slow connections |

## Data Source

All price data is sourced from **[Bank Indonesia PIHPS](https://www.bi.go.id/hargapangan)** (Pusat Informasi Harga Pangan Strategis) — a national food price monitoring system managed by Bank Indonesia in cooperation with regional governments.

- **Coverage**: 38 provinces, 21 strategic commodities
- **Markets**: Traditional markets (pasar tradisional) and modern markets (supermarket/minimarket)
- **Frequency**: Updated daily; scraped automatically at 09:00 and 17:00 WIB
- **Lag**: ~1 day from field recording to publication

## Commodities Tracked

```
🍚 Beras Premium · Beras Medium · Beras IR 64 (+ 3 kualitas lainnya)
🧅 Bawang Merah          🧄 Bawang Putih
🌶️ Cabai Merah Keriting  🌶️ Cabai Merah Besar
🌶️ Cabai Rawit Merah     🌶️ Cabai Rawit Hijau
🍗 Daging Ayam Ras        🥩 Daging Sapi Murni · Daging Sapi Has
🥚 Telur Ayam Ras
🧴 Minyak Goreng Curah · Kemasan · Kemasan Premium
🍬 Gula Pasir Lokal · Gula Pasir Premium
```

## Architecture

```
                ┌──────────────────────────────────────┐
                │        Bank Indonesia PIHPS           │
                │   (https://www.bi.go.id/hargapangan)  │
                └─────────────────┬────────────────────┘
                                  │ Daily scrape
                                  ▼
                ┌──────────────────────────────────────┐
                │          GitHub Actions               │
                │   Cron: 09:00 WIB + 17:00 WIB daily  │
                │   Python scraper → upsert to DB       │
                └─────────────────┬────────────────────┘
                                  │
                                  ▼
                ┌──────────────────────────────────────┐
                │         Supabase (PostgreSQL)         │
                │  prices · provinces · commodities     │
                │  national_averages (materialized view) │
                └──────────┬───────────────────────────┘
                           │
                           ▼
                ┌──────────────────────────────────────┐
                │        Next.js 16 (App Router)        │
                │        Vercel · pangan-id.vercel.app  │
                │                                       │
                │  /                — Homepage dashboard │
                │  /komoditas/[slug] — Commodity detail  │
                │  /provinsi/[slug]  — Province detail   │
                │  /bandingkan       — Price comparison  │
                │  /insight          — Auto insights     │
                │  /tentang          — About             │
                │  /api/chat         — Pai AI endpoint   │
                └─────────────────┬────────────────────┘
                                  │
                     Scoped queries │ Natural-language chat
                                  ▼
                ┌──────────────────────────────────────┐
                │            Pai (Pangan AI)            │
                │  Ollama-compatible model + food tools │
                │  Deterministic fallback over Supabase │
                └──────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Map | Custom SVG choropleth |
| Database | Supabase (PostgreSQL + materialized views) |
| Scraper | Python, httpx, BeautifulSoup |
| Automation | GitHub Actions (cron schedule) |
| Deployment | Vercel (frontend), Supabase (database) |
| AI chat | Pai (Pangan AI), Ollama-compatible API, Supabase tool queries |
| AI tooling | Claude Opus 4.6 via Claude Code (development) |

## How Claude Opus 4.6 Was Used

The codebase — from the Next.js frontend to the Python scraper to the database schema — was built using **Claude Opus 4.6 via Google Antigravity IDE**. Claude was used as a development tool. In production, Pangan.id can optionally run **Pai**, a scoped AI chat assistant backed by an Ollama-compatible model plus deterministic Supabase queries. Auto insights in the app are still generated by SQL queries and JavaScript logic.

## Pai (Pangan AI)

Pai is a scoped chat assistant embedded on the homepage. It is designed to answer only food-price questions using Pangan.id data, for example:

- `Komoditas apa yang naik paling tinggi 30 hari terakhir?`
- `Bahan pangan apa yang termurah di Jogja?`
- `Harga beras di Jawa Tengah`
- `Kalau yang premium?`
- `Kalau nasional?`

Pai combines two layers:

1. **LLM layer** via an Ollama-compatible API for flexible natural-language handling
2. **Deterministic query fallback** over Supabase for structured questions and robust follow-up handling

This keeps answers grounded in the scraped BI PIHPS dataset while still making the UX conversational.

## Development

```bash
# Clone the repo
git clone https://github.com/gnatnib/pangan.id
cd pangan.id

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# Optional but recommended for Pai AI:
# OLLAMA_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL

# Run the development server
npm run dev
```

```bash
# Run the scraper locally (requires Python 3.11+)
cd scripts
pip install -r requirements.txt

cp .env.example .env
# Fill in SUPABASE_URL and SUPABASE_KEY (service role)

python scraper.py
```

## GitHub Actions Setup

Add these secrets to your repository (`Settings → Secrets → Actions`):

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (write access) |

The scraper will then run automatically every day at **09:00 and 17:00 WIB**.

## Project Structure

```
pangan.id/
├── .github/
│   └── workflows/
│       └── daily-scrape.yml        # Cron scraper workflow
├── scripts/
│   ├── scraper.py                  # Main BI PIHPS scraper
│   ├── backfill.py                 # One-time historical data fill
│   ├── refresh_views.py            # Refresh materialized views
│   └── requirements.txt
├── src/
│   ├── app/
│   │   ├── page.tsx                # Homepage
│   │   ├── layout.tsx              # Root layout
│   │   ├── komoditas/[slug]/       # Commodity detail
│   │   ├── provinsi/[slug]/        # Province detail
│   │   ├── bandingkan/             # Price comparison
│   │   ├── api/chat/               # Pai AI API route
│   │   ├── insight/                # Auto insights
│   │   └── tentang/                # About
│   ├── components/
│   │   ├── PriceCard.tsx
│   │   ├── PriceChart.tsx
│   │   ├── IndonesiaMap.tsx
│   │   ├── AiChatPanel.tsx
│   │   ├── SortControls.tsx
│   │   ├── DateRangePicker.tsx
│   │   └── Navbar.tsx
│   └── lib/
│       ├── food-chat.ts
│       ├── server-supabase.ts
│       ├── supabase.ts
│       ├── types.ts
│       └── utils.ts
├── public/
│   └── panganidlogo.png
├── .env.local.example
└── README.md
```

---

<p align="center">
  Built with <a href="https://anthropic.com">Claude Opus 4.6</a> · Data dari <a href="https://www.bi.go.id/hargapangan">Bank Indonesia PIHPS</a>
  <br />
  <a href="https://pangan-id.vercel.app">pangan-id.vercel.app</a>
</p>

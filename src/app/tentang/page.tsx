import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Tentang Pangan.id",
  description:
    "Pangan.id — platform pemantauan harga pangan strategis Indonesia. Data bersumber dari Bank Indonesia PIHPS.",
};

export default function TentangPage() {
  return (
    <div className="container-page py-8 max-w-3xl">
      {/* Logo — not a link */}
      <div className="flex justify-center mb-8">
        <Image
          src="/panganidlogo.png"
          alt="Pangan.id"
          width={200}
          height={160}
          className="object-contain"
          priority
        />
      </div>

      <h1 className="text-2xl font-bold text-warm-800 tracking-tight mb-6 text-center">
        Tentang Pangan.id
      </h1>

      <div className="prose prose-sm max-w-none text-warm-600 space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Apa itu Pangan.id?
          </h2>
          <p className="leading-relaxed">
            Pangan.id adalah platform pemantauan harga bahan pangan strategis di
            seluruh Indonesia. Kami menyajikan data harga harian untuk 21
            komoditas pangan di 38 provinsi, dilengkapi dengan visualisasi tren,
            perbandingan antar provinsi, dan insight otomatis.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Sumber Data
          </h2>
          <p className="leading-relaxed">
            Data bersumber dari{" "}
            <a
              href="https://www.bi.go.id/hargapangan"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-orange hover:underline"
            >
              PIHPS Bank Indonesia
            </a>{" "}
            (Pusat Informasi Harga Pangan Strategis). PIHPS merupakan sistem
            pemantauan harga pangan nasional yang dikelola oleh Bank Indonesia
            bekerja sama dengan instansi terkait.
          </p>
          <p className="leading-relaxed mt-2">
            Data di-update secara otomatis setiap hari pada pukul 17:00 dan
            21:00 WIB. Terdapat lag 1 hari dari waktu pencatatan harga di
            lapangan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Pasar Tradisional vs Pasar Modern
          </h2>
          <p className="leading-relaxed">
            <strong>Pasar Tradisional</strong> mencakup pasar-pasar rakyat,
            pasar induk, dan pasar basah di seluruh Indonesia. Harga di pasar
            tradisional umumnya lebih berfluktuasi karena dipengaruhi oleh
            supply-demand langsung.
          </p>
          <p className="leading-relaxed mt-2">
            <strong>Pasar Modern</strong> mencakup supermarket, hypermarket, dan
            minimarket. Harga cenderung lebih stabil namun bisa lebih tinggi
            karena memperhitungkan biaya operasional tambahan.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Komoditas yang Dipantau
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              "🍚 Beras (6 kualitas)",
              "🧅 Bawang Merah",
              "🧄 Bawang Putih",
              "🌶️ Cabai Merah (2 jenis)",
              "🌶️ Cabai Rawit (2 jenis)",
              "🍗 Daging Ayam",
              "🥩 Daging Sapi (2 kualitas)",
              "🥚 Telur Ayam",
              "🧴 Minyak Goreng (3 jenis)",
              "🍬 Gula Pasir (2 jenis)",
            ].map((item) => (
              <p key={item} className="text-warm-600">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Teknologi
          </h2>
          <p className="leading-relaxed">
            Pangan.id dibangun dengan Next.js, Supabase, dan Tailwind CSS.
            Data di-scrape secara otomatis menggunakan GitHub Actions. Seluruh
            insight dihasilkan dari analisis data — tidak menggunakan AI/LLM.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Kontak & Kontribusi
          </h2>
          <p className="leading-relaxed">
            Pangan.id adalah proyek open source. Jika Anda menemukan kesalahan
            data atau ingin berkontribusi, silakan kunjungi repository GitHub
            kami atau hubungi melalui email.
          </p>
        </section>

        <section className="pt-4 border-t border-warm-200">
          <p className="text-xs text-warm-400">
            Disclaimer: Pangan.id bukan situs resmi pemerintah. Data yang
            ditampilkan bersumber dari sistem publik PIHPS Bank Indonesia.
            Pangan.id tidak bertanggung jawab atas akurasi data yang disajikan.
          </p>
        </section>
      </div>
    </div>
  );
}

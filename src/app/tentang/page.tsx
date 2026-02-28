"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// Move metadata export to a separate layout/metadata file since this is now a client component
// export const metadata: Metadata = { ... }

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function TentangPage() {
  return (
    <div className="container-page py-8 max-w-3xl">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex justify-center mb-8"
      >
        <Image
          src="/panganidlogo.png"
          alt="Pangan.id"
          width={200}
          height={160}
          className="object-contain"
          priority
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: "easeOut" }}
        className="text-2xl font-bold text-warm-800 tracking-tight mb-6 text-center"
      >
        Tentang Pangan.id
      </motion.h1>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="prose prose-sm max-w-none text-warm-600 space-y-6"
      >
        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Apa itu Pangan.id?
          </h2>
          <p className="leading-relaxed">
            Pangan.id adalah platform pemantauan harga bahan pangan strategis di
            seluruh Indonesia. Kami menyajikan data harga harian untuk 21
            komoditas pangan di 38 provinsi, dilengkapi dengan visualisasi tren,
            perbandingan antar provinsi, dan insight otomatis.
          </p>
        </motion.section>

        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
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
        </motion.section>

        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
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
        </motion.section>

        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Komoditas yang Dipantau
          </h2>
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 gap-2 text-sm"
          >
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
              <motion.p
                key={item}
                variants={fadeUp}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-warm-600"
              >
                {item}
              </motion.p>
            ))}
          </motion.div>
        </motion.section>

        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Teknologi
          </h2>
          <p className="leading-relaxed">
            Pangan.id dibangun dengan Next.js, Supabase, dan Tailwind CSS.
            Data di-scrape secara otomatis menggunakan GitHub Actions. Seluruh
            insight dihasilkan dari analisis data — tidak menggunakan AI/LLM.
          </p>
        </motion.section>

        <motion.section variants={fadeUp} transition={{ duration: 0.35, ease: "easeOut" }}>
          <h2 className="text-lg font-semibold text-warm-800 mb-2">
            Kontak & Kontribusi
          </h2>
          <p className="leading-relaxed">
            Pangan.id adalah proyek open source. Jika Anda menemukan kesalahan
            data atau ingin berkontribusi, silakan kunjungi repository GitHub
            kami atau hubungi melalui email.
          </p>
          <motion.a
            href="https://github.com/gnatnib/pangan.id"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-lg bg-warm-100 hover:bg-warm-200 text-warm-700 text-sm font-medium transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-current"
              aria-hidden="true"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            gnatnib/pangan.id
          </motion.a>
        </motion.section>

        <motion.section
          variants={fadeUp}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="pt-4 border-t border-warm-200"
        >
          <p className="text-xs text-warm-400">
            Disclaimer: Pangan.id bukan situs resmi pemerintah. Data yang
            ditampilkan bersumber dari sistem publik PIHPS Bank Indonesia.
            Pangan.id tidak bertanggung jawab atas akurasi data yang disajikan.
          </p>
        </motion.section>
      </motion.div>
    </div>
  );
}
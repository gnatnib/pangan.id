"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { formatDateLong } from "@/lib/utils";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

interface AiChatPanelProps {
  latestDate: string;
}

const QUICK_PROMPTS = [
  "Komoditas apa yang naik paling tinggi 30 hari terakhir?",
  "Bahan pangan apa yang termurah di Jogja?",
  "Berapa harga cabai rawit merah nasional hari ini?",
  "Provinsi mana yang paling murah untuk telur ayam ras segar?",
];

export function AiChatPanel({ latestDate }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        `Halo! Saya bisa bantu analisis data harga pangan Pangan.id. ` +
        `Data terbaru yang tersedia saat ini adalah ${formatDateLong(latestDate)}. ` +
        `Coba tanya soal tren harga, komoditas termurah, atau perbandingan antar provinsi.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  async function sendMessage(rawInput: string) {
    const content = rawInput.trim();
    if (!content || isLoading) return;

    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsLoading(true);
    inputRef.current?.focus();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok || !data.reply) {
        throw new Error(data.error || "Gagal mendapatkan jawaban AI.");
      }

      setMessages((current) => [...current, { role: "assistant", content: data.reply || "" }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi error saat menghubungi AI.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="mb-8"
    >
      <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.45, delay: 0.05, ease: "easeOut" }}
          className="card overflow-hidden rounded-3xl border-warm-200 shadow-[0_14px_40px_rgba(0,0,0,0.05)]"
        >
          <div className="flex items-center justify-between border-b border-warm-200 bg-white px-4 py-3 sm:px-5">
            <div>
              <p className="text-sm font-semibold text-warm-800">Chat Pangan AI</p>
              <p className="text-xs text-warm-400">Jawaban berbasis data Pangan.id dan BI PIHPS</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-green-light px-3 py-1 text-[11px] font-medium text-brand-green">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              Data-focused
            </div>
          </div>

          <div className="flex h-[560px] flex-col bg-[linear-gradient(180deg,_rgba(250,250,248,0.85)_0%,_#ffffff_100%)] sm:h-[620px]">
            <div ref={messagesRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-warm-800 text-white"
                        : "border border-warm-200 bg-white text-warm-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-warm-200 bg-white px-4 py-3 text-sm text-warm-500 shadow-sm">
                    Sedang menganalisis data pangan...
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-warm-200 bg-white px-4 py-4 sm:px-5">
              <div className="mb-3 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading}
                    className="rounded-full bg-warm-100 px-3 py-1.5 text-xs text-warm-600 transition hover:bg-brand-orange-light hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendMessage(input);
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <label className="sr-only" htmlFor="pangan-ai-input">
                  Tulis pertanyaan tentang harga pangan
                </label>
                <textarea
                  ref={inputRef}
                  id="pangan-ai-input"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="Tanya soal harga bahan pangan, misalnya: komoditas apa yang naik paling tinggi 30 hari terakhir?"
                  rows={3}
                  className="min-h-[88px] w-full resize-none rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-700 outline-none transition placeholder:text-warm-400 focus:border-brand-orange focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-warm-800 px-5 text-sm font-semibold text-white transition hover:bg-warm-700 disabled:cursor-not-allowed disabled:bg-warm-300"
                >
                  {isLoading ? "Memproses..." : "Kirim"}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
    </motion.section>
  );
}

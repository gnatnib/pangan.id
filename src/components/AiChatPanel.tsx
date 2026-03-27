"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
        `Halo! 👋 Saya Pai, asisten harga pangan kamu. ` +
        `Tanya apa aja soal harga beras, cabai, telur, daging, minyak goreng, dan lainnya — ` +
        `mau cek harga terbaru, tren naik/turun, atau bandingin antar provinsi, saya siap bantu! 😊`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFloatingChat, setShowFloatingChat] = useState(false);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const mainMessagesRef = useRef<HTMLDivElement | null>(null);
  const floatingMessagesRef = useRef<HTMLDivElement | null>(null);
  const mainInputRef = useRef<HTMLTextAreaElement | null>(null);
  const floatingInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    [mainMessagesRef.current, floatingMessagesRef.current].forEach((container) => {
      if (!container) return;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isLoading]);

  useEffect(() => {
    const syncFloatingState = () => {
      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      setShowFloatingChat(rect.bottom < 120);
    };

    syncFloatingState();
    window.addEventListener("scroll", syncFloatingState, { passive: true });
    window.addEventListener("resize", syncFloatingState);

    return () => {
      window.removeEventListener("scroll", syncFloatingState);
      window.removeEventListener("resize", syncFloatingState);
    };
  }, []);

  useEffect(() => {
    if (!showFloatingChat) {
      setIsFloatingMinimized(false);
    }
  }, [showFloatingChat]);

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
    requestAnimationFrame(() => {
      const activeInput = showFloatingChat && !isFloatingMinimized
        ? floatingInputRef.current
        : mainInputRef.current;
      activeInput?.focus();
    });

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

  function renderMessages(
    containerRef: RefObject<HTMLDivElement | null>,
    floating: boolean,
    className: string
  ) {
    const renderedMessages = floating ? messages.slice(-6) : messages;

    return (
      <div ref={containerRef} className={`space-y-3 overflow-y-auto ${className}`}>
        {renderedMessages.map((message, index) => (
          <div
            key={`${floating ? "floating" : "main"}-${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                floating ? "max-w-[92%]" : "max-w-[88%]"
              } ${
                message.role === "user"
                  ? "bg-warm-800 text-white"
                  : "border border-warm-200 bg-white text-warm-700"
              }`}
            >
              {message.role === "user" ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div
                  className="whitespace-pre-wrap prose-chat"
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br />"),
                  }}
                />
              )}
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
    );
  }

  function renderComposer(inputElementRef: RefObject<HTMLTextAreaElement | null>, compact = false) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
        className={`flex ${compact ? "flex-col gap-2" : "flex-col gap-3 sm:flex-row sm:items-end"}`}
      >
        <label className="sr-only" htmlFor={compact ? "pangan-ai-input-floating" : "pangan-ai-input"}>
          Tulis pertanyaan tentang harga pangan
        </label>
        <textarea
          ref={inputElementRef}
          id={compact ? "pangan-ai-input-floating" : "pangan-ai-input"}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Tanya soal harga bahan pangan..."
          rows={compact ? 2 : 3}
          className={`w-full resize-none rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-sm text-warm-700 outline-none transition placeholder:text-warm-400 focus:border-brand-orange focus:bg-white ${
            compact ? "min-h-[72px]" : "min-h-[88px]"
          }`}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`inline-flex cursor-pointer items-center justify-center rounded-2xl bg-warm-800 px-5 text-sm font-semibold text-white transition hover:bg-warm-700 disabled:cursor-not-allowed disabled:bg-warm-300 ${
            compact ? "h-10 self-end" : "h-11"
          }`}
        >
          {isLoading ? "Memproses..." : "Kirim"}
        </button>
      </form>
    );
  }

  return (
    <motion.section
      ref={sectionRef}
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
            {renderMessages(mainMessagesRef, false, "flex-1 px-4 py-4 sm:px-5")}

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

              {renderComposer(mainInputRef)}
            </div>
          </div>
        </motion.div>

      <AnimatePresence>
        {showFloatingChat && (
          <AnimatePresence mode="wait">
            {isFloatingMinimized ? (
              <motion.button
                key="floating-minimized"
                type="button"
                initial={{ opacity: 0, y: 18, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.94 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => {
                  setIsFloatingMinimized(false);
                  requestAnimationFrame(() => floatingInputRef.current?.focus());
                }}
                className="fixed inset-x-3 bottom-3 z-50 flex cursor-pointer items-center justify-between rounded-2xl border border-warm-200 bg-white/96 px-4 py-3 text-left shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[320px]"
              >
                <div>
                  <p className="text-sm font-semibold text-warm-800">Chat Pangan AI</p>
                  <p className="text-[11px] text-warm-400">Buka lagi untuk lanjut bertanya</p>
                </div>
                <span className="rounded-full bg-brand-green-light px-3 py-1 text-[11px] font-medium text-brand-green">
                  Buka
                </span>
              </motion.button>
            ) : (
              <motion.div
                key="floating-expanded"
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="fixed inset-x-3 bottom-3 z-50 overflow-hidden rounded-3xl border border-warm-200 bg-white/95 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[430px]"
              >
                <div className="flex items-center justify-between border-b border-warm-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-warm-800">Chat Pangan AI</p>
                    <p className="text-[11px] text-warm-400">Tetap aktif saat kamu scroll</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-brand-green-light px-3 py-1 text-[11px] font-medium text-brand-green">
                      Floating
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFloatingMinimized(true)}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-warm-200 bg-white text-base font-semibold text-warm-500 transition hover:border-warm-300 hover:text-warm-700"
                      aria-label="Minimize chat floating"
                    >
                      -
                    </button>
                  </div>
                </div>

                <div className="flex h-[320px] flex-col bg-[linear-gradient(180deg,_rgba(250,250,248,0.92)_0%,_#ffffff_100%)] sm:h-[360px]">
                  {renderMessages(floatingMessagesRef, true, "flex-1 px-4 py-4")}
                  <div className="border-t border-warm-200 px-4 py-3">
                    {renderComposer(floatingInputRef, true)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

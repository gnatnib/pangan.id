import { NextResponse } from "next/server";
import { generateFoodChatReply } from "@/lib/food-chat";

export const runtime = "nodejs";

type RequestMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: RequestMessage[] };
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Pesan chat tidak boleh kosong." },
        { status: 400 }
      );
    }

    const reply = await generateFoodChatReply(messages);
    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("AI_API_KEY") || message.includes("OLLAMA_API_KEY") ? 503 : 500;

    return NextResponse.json(
      {
        error:
          status === 503
            ? "AI chat belum aktif. Tambahkan OLLAMA_API_KEY untuk Ollama Cloud atau AI_API_KEY untuk provider OpenAI-compatible."
            : "Terjadi error saat memproses chat AI.",
      },
      { status }
    );
  }
}

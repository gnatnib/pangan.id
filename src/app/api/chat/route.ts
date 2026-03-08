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
  } catch {
    return NextResponse.json(
      {
        error: "Maaf, saya sedang kesulitan memproses pertanyaan itu. Coba ubah pertanyaannya tetap dalam scope harga pangan, komoditas, provinsi, atau tren harga.",
      },
      { status: 500 }
    );
  }
}

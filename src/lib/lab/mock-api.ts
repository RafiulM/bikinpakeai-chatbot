import { maskSensitive } from "./mask";
import type { ConversationTurn } from "./types";

// Stand-in for POST /api/conversations/:id/messages while the backend is not
// wired yet. It resolves with the same ConversationTurn shape the API returns.

const CANNED: Record<string, string> = {
  "Cara upgrade ke membership Pro?":
    "Buka halaman Harga Bikinpakeai, pilih paket Pro, lalu selesaikan pembayaran. Akses Pro aktif di akun dengan email yang sama setelah pembayaran terkonfirmasi.",
  "Lupa password akun PRDTask":
    "Di halaman masuk PRDTask, pilih “Lupa password”, lalu ikuti tautan yang dikirim ke email Anda. Demi keamanan, jangan kirim password lewat chat ini.",
  "Template yang saya beli tidak bisa diunduh":
    "Coba unduh ulang dari menu Pembelian Saya. Kalau tombolnya masih tidak berfungsi, kirim nomor invoice dan nama template-nya supaya bisa saya cek.",
  "Cara gabung komunitas Discord?":
    "Tautan undangan komunitas ada di dasbor member. Masuk dengan akun membership aktif, lalu pilih Gabung Komunitas.",
};

const FALLBACK =
  "Terima kasih, pertanyaannya sudah saya terima. (Data contoh) Setelah backend tersambung, jawaban ini disusun pipeline Jev dari knowledge base Bikinpakeai.";

let counter = 0;

export async function mockSendMessage(
  conversationId: string,
  text: string,
  delayMs = 900,
): Promise<ConversationTurn> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  counter += 1;
  const id = `mock-local-${Date.now()}-${counter}`;
  const createdAt = new Date().toISOString();
  const { text: content, masked } = maskSensitive(text);
  const reply = masked
    ? "Demi keamanan, nomor kartu sudah saya samarkan dan tidak disimpan. Untuk pengecekan cukup nomor invoice dari email pembayaran."
    : (CANNED[text] ?? FALLBACK);
  return {
    message: {
      id,
      conversationId,
      sender: "customer",
      content,
      isMasked: masked,
      createdAt,
    },
    analysis: null,
    analysisStatus: "pending",
    withJev: {
      id: `${id}-jev`,
      messageId: id,
      mode: "with_jev",
      content: reply,
      latencyMs: 780,
      costUsd: 0.0004,
      isVerified: true,
      review: { verdict: "correct", verdictLabel: "Tepat", issues: [] },
    },
    withoutJev: null,
    ticketId: null,
  };
}

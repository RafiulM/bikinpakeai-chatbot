import test from "node:test";
import assert from "node:assert/strict";
import { buildTranscript } from "../src/lib/lab/transcript.ts";

const response = (mode, content, verdictLabel, issues = []) => ({
  id: `${mode}-1`,
  messageId: "m-1",
  mode,
  content,
  latencyMs: 640,
  costUsd: 0.0004,
  isVerified: mode === "with_jev",
  review: {
    verdict: issues.length ? "wrong" : "correct",
    verdictLabel,
    issues,
  },
});

const turn = (id, minute, content, extra = {}) => ({
  message: {
    id,
    conversationId: "c-1",
    sender: "customer",
    content,
    isMasked: false,
    createdAt: new Date(Date.UTC(2026, 9, 3, 2, minute)).toISOString(),
  },
  analysis: null,
  withJev: null,
  withoutJev: null,
  ticketId: null,
  ...extra,
});

const conversation = {
  code: "#A-1001",
  title: "Refund",
  turns: [
    turn("m-2", 19, "Mau refund aja.", {
      analysisStatus: "failed",
      analysisError: "Jev tidak merespons",
      ticketId: "T-201",
      agentReplies: [
        {
          id: "r-1",
          ticketId: "t-1",
          agentName: "Rina",
          content: "Sudah kami cek.",
          createdAt: new Date(Date.UTC(2026, 9, 3, 2, 25)).toISOString(),
        },
      ],
    }),
    turn("m-1", 18, "Ini nomor kartu saya 4111 •••• •••• 1111", {
      analysis: {
        labels: [
          { label: "Jenis masalah", value: "Pembayaran", confidence: 0.92 },
          {
            label: "Data sensitif",
            value: "Ya",
            confidence: 0.97,
            flagged: true,
          },
        ],
        routeLabel: "Template keamanan data",
        routeReason: "Data sensitif disamarkan.",
      },
      withJev: response("with_jev", "Cukup kirim nomor invoice.", "Tepat"),
      withoutJev: response("without_jev", "Kartu 4111 sudah dicek.", "Salah", [
        "Mengulang nomor kartu",
      ]),
    }),
    turn("m-3", 30, "Masih dikirim", { deliveryStatus: "sending" }),
  ],
};
const exportedAt = new Date(Date.UTC(2026, 9, 3, 3, 0)).toISOString();

test("the transcript lists every message with Jev's reading and both answers", () => {
  const text = buildTranscript(conversation, { exportedAt });

  const lines = text.split("\n");
  assert.equal(lines[0], "Transkrip #A-1001 · Refund");
  assert.match(
    lines[1],
    /Sabtu, 3 Oktober 2026 10\.00 WIB · 2 pesan pelanggan$/,
  );
  // Oldest first, unsent messages left out.
  assert.ok(text.indexOf("Pesan 1 · 09.18") < text.indexOf("Pesan 2 · 09.19"));
  assert.ok(!text.includes("Masih dikirim"));
  assert.ok(
    text.includes(
      "Label Jev: Jenis masalah Pembayaran (92%) · Data sensitif Ya (97%) ⚑",
    ),
  );
  assert.ok(
    text.includes(
      "Keputusan Jev: Template keamanan data — Data sensitif disamarkan.",
    ),
  );
  assert.ok(
    text.includes(
      "Tanpa Jev: [Salah: Mengulang nomor kartu · 0,64 dtk · $0,0004] Kartu 4111 sudah dicek.",
    ),
  );
  assert.ok(text.includes("Label Jev: gagal dibaca (Jev tidak merespons)"));
  assert.ok(text.includes("Dengan Jev: (belum ada jawaban)"));
  assert.ok(text.includes("Tiket: T-201"));
  assert.ok(text.includes("Tim support (Rina, 09.25): Sudah kami cek."));
});

test("markdown, brief labels and leaving out the baseline", () => {
  const text = buildTranscript(conversation, {
    exportedAt,
    format: "markdown",
    labels: "brief",
    includeBaseline: false,
  });
  assert.ok(text.startsWith("# Transkrip #A-1001 · Refund\n\n_Bikinpakeai"));
  assert.ok(text.includes("## Pesan 1 · 09.18\n\n- **Pelanggan:**"));
  assert.ok(text.includes("- **Label Jev:** Pembayaran · Data sensitif Ya ⚑"));
  assert.ok(text.includes("- **Keputusan Jev:** Template keamanan data\n"));
  assert.ok(!text.includes("Tanpa Jev:"));
  assert.ok(text.includes("- **Tim support (Rina, 09.25):** Sudah kami cek."));
});

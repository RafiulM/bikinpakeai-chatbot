import test from "node:test";
import assert from "node:assert/strict";
import { frustrationLevel, sortTickets } from "../src/lib/lab/tickets.ts";

const ticket = (code, priority, frustrationScore, minute) => ({
  code,
  priority,
  frustrationScore,
  createdAt: new Date(Date.UTC(2026, 9, 1, 7, minute)).toISOString(),
});

test("queue order is priority, then frustration, then age", () => {
  const sorted = sortTickets([
    ticket("low-angry", "low", 0.95, 1),
    ticket("high-calm", "high", 0.2, 5),
    ticket("urgent", "urgent", 0.5, 9),
    ticket("high-angry", "high", 0.9, 7),
    ticket("high-angry-older", "high", 0.9, 2),
  ]);
  assert.deepEqual(
    sorted.map((t) => t.code),
    ["urgent", "high-angry-older", "high-angry", "high-calm", "low-angry"],
  );
});

test("frustration levels use fixed thresholds", () => {
  assert.equal(frustrationLevel(0.86), "tinggi");
  assert.equal(frustrationLevel(0.75), "tinggi");
  assert.equal(frustrationLevel(0.48), "sedang");
  assert.equal(frustrationLevel(0.1), "rendah");
});

test("alternative orders put the angriest or the longest-waiting first", () => {
  const tickets = [
    ticket("urgent-new", "urgent", 0.5, 9),
    ticket("low-angry", "low", 0.95, 5),
    ticket("medium-oldest", "medium", 0.3, 1),
  ];
  assert.deepEqual(
    sortTickets(tickets, "frustration").map((t) => t.code),
    ["low-angry", "urgent-new", "medium-oldest"],
  );
  assert.deepEqual(
    sortTickets(tickets, "waiting").map((t) => t.code),
    ["medium-oldest", "low-angry", "urgent-new"],
  );
});

test("filters split active from done and search across key fields", async () => {
  const { filterTickets } = await import("../src/lib/lab/tickets.ts");
  const base = {
    product: "PRDTask",
    issueLabel: "Bug",
    summary: "Ekspor gagal",
    conversationCode: "#A-1",
  };
  const tickets = [
    { ...base, code: "T-1", status: "open" },
    { ...base, code: "T-2", status: "claimed", product: "AndalAI" },
    { ...base, code: "T-3", status: "closed" },
  ];
  assert.deepEqual(
    filterTickets(tickets, "active", "").map((t) => t.code),
    ["T-1", "T-2"],
  );
  assert.deepEqual(
    filterTickets(tickets, "done", "").map((t) => t.code),
    ["T-3"],
  );
  assert.deepEqual(
    filterTickets(tickets, "all", " andal ").map((t) => t.code),
    ["T-2"],
  );
  assert.deepEqual(filterTickets(tickets, "done", "andal"), []);
});

test("escalations become tickets with a priority and a briefing", async () => {
  const { ticketDraft, ticketPriority } =
    await import("../src/lib/lab/tickets.ts");
  const input = {
    messageText: "Sudah 3 hari begini, saya kecewa banget. Mau refund aja.",
    product: "DesainPakeAI",
    issueType: "pembayaran",
    urgency: "tinggi",
    frustrationScore: 0.86,
    churnRisk: 0.78,
    refundRequested: true,
    rules: [
      "Frustrasi 0,86 melewati ambang 0,75",
      "Permintaan refund wajib ditangani manusia",
    ],
  };
  const draft = ticketDraft(input);
  assert.equal(draft.priority, "urgent");
  assert.equal(draft.issueLabel, "Pembayaran · refund");
  assert.equal(
    draft.escalationReason,
    "Frustrasi 0,86 melewati ambang 0,75; Permintaan refund wajib ditangani manusia",
  );
  assert.ok(draft.summaryPoints.includes("Pelanggan meminta refund."));
  assert.ok(draft.title.length <= 120);
  assert.equal(
    ticketPriority({
      ...input,
      frustrationScore: 0.5,
      churnRisk: 0.2,
      urgency: "sedang",
      refundRequested: false,
    }),
    "medium",
  );
  assert.equal(
    ticketPriority({ ...input, frustrationScore: 0.76, urgency: "sedang" }),
    "high",
  );
  assert.equal(
    ticketPriority({
      ...input,
      frustrationScore: 0.1,
      churnRisk: 0.1,
      urgency: "rendah",
      refundRequested: false,
    }),
    "low",
  );
});

test("ticket status changes follow the allowed transitions", async () => {
  const { nextTicketStatus } = await import("../src/lib/lab/tickets.ts");
  assert.equal(nextTicketStatus("open", "claimed", null), "claimed");
  assert.equal(nextTicketStatus("open", "closed", null), "closed");
  assert.equal(nextTicketStatus("claimed", "closed", "Kamu"), "closed");
  assert.equal(nextTicketStatus("closed", "open", "Kamu"), "claimed");
  assert.equal(nextTicketStatus("closed", "open", null), "open");
  assert.equal(nextTicketStatus("closed", "closed", null), null);
  assert.equal(nextTicketStatus("open", "open", null), null);
});

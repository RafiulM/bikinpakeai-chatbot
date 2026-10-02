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

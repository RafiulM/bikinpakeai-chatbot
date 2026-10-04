import test from "node:test";
import assert from "node:assert/strict";
import {
  addToTally,
  emptyTally,
  peakLevel,
  percentOf,
  ranked,
  tallyJev,
} from "../src/lib/lab/session-overview.ts";
import { FRUSTRATION_LEVELS, URGENCIES } from "../src/lib/lab/types.ts";

const row = (overrides) => ({
  count: 1,
  issueType: "pembayaran",
  urgency: "sedang",
  product: "PRDTask",
  emotion: "rendah",
  decision: "answered",
  sensitiveData: false,
  injection: false,
  churnRisk: false,
  refund: false,
  ...overrides,
});

test("grouped Jev rows are counted per message on every measure", () => {
  const tally = tallyJev([
    row({ count: 2 }),
    row({
      issueType: "bug",
      urgency: "mendesak",
      product: "DesignKit",
      emotion: "tinggi",
      decision: "escalated",
      churnRisk: true,
      refund: true,
    }),
    row({ issueType: "akses_akun", sensitiveData: true, decision: "masked" }),
  ]);
  assert.equal(tally.analyzed, 4);
  assert.deepEqual(tally.intents, { pembayaran: 2, bug: 1, akses_akun: 1 });
  assert.deepEqual(tally.emotions, { rendah: 3, tinggi: 1 });
  assert.deepEqual(tally.urgencies, { sedang: 3, mendesak: 1 });
  assert.deepEqual(tally.products, { PRDTask: 3, DesignKit: 1 });
  assert.deepEqual(tally.decisions, { answered: 2, escalated: 1, masked: 1 });
  assert.deepEqual(tally.signals, {
    sensitiveData: 1,
    injection: 0,
    churnRisk: 1,
    refund: 1,
  });
});

test("unknown or missing readings never become a category", () => {
  const tally = tallyJev([
    row({ issueType: "lainnya", urgency: null, emotion: null, product: "  " }),
    row({ count: 0, issueType: "bug" }),
  ]);
  assert.equal(tally.analyzed, 1);
  assert.deepEqual(tally.intents, {});
  assert.deepEqual(tally.urgencies, {});
  assert.deepEqual(tally.emotions, {});
  assert.deepEqual(tally.products, {});
});

test("tallies add up across conversations", () => {
  const tally = emptyTally();
  addToTally(tally, [row({})]);
  addToTally(tally, [row({ issueType: "bug" })]);
  assert.equal(tally.analyzed, 2);
  assert.deepEqual(tally.intents, { pembayaran: 1, bug: 1 });
});

test("the peak is the most severe level that occurred", () => {
  assert.equal(
    peakLevel(FRUSTRATION_LEVELS, { rendah: 4, sedang: 1 }),
    "sedang",
  );
  assert.equal(peakLevel(URGENCIES, { mendesak: 1, rendah: 9 }), "mendesak");
  assert.equal(peakLevel(URGENCIES, {}), null);
});

test("ranked lists the most frequent first and drops zeros", () => {
  assert.deepEqual(ranked({ bug: 1, pembayaran: 3, cara_pakai: 0 }), [
    ["pembayaran", 3],
    ["bug", 1],
  ]);
  assert.equal(percentOf(1, 3), 33);
  assert.equal(percentOf(0, 0), 0);
});

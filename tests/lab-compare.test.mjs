import test from "node:test";
import assert from "node:assert/strict";
import {
  pickWinner,
  splitHighlight,
  verdictsDiffer,
} from "../src/lib/lab/compare.ts";

function response(mode, verdict, latencyMs, costUsd) {
  return {
    id: mode,
    messageId: "m",
    mode,
    content: "jawaban",
    latencyMs,
    costUsd,
    isVerified: false,
    review: { verdict, verdictLabel: verdict, issues: [] },
  };
}

function turn(jev, base) {
  return {
    message: {
      id: "m",
      conversationId: "c",
      sender: "customer",
      content: "q",
      isMasked: false,
      createdAt: new Date(0).toISOString(),
    },
    analysis: null,
    withJev: jev,
    withoutJev: base,
    ticketId: null,
  };
}

test("a right answer beats a wrong one regardless of speed", () => {
  const result = pickWinner(
    turn(
      response("with_jev", "correct", 5000, 0.01),
      response("without_jev", "wrong", 100, 0.0001),
    ),
  );
  assert.equal(result, "with_jev");
});

test("a correct hand-off to a human counts as right", () => {
  const t = turn(
    response("with_jev", "escalated", 1000, 0.001),
    response("without_jev", "wrong", 900, 0.001),
  );
  assert.equal(pickWinner(t), "with_jev");
  assert.equal(verdictsDiffer(t), true);
});

test("equal verdicts fall back to latency, then cost, then a tie", () => {
  assert.equal(
    pickWinner(
      turn(
        response("with_jev", "correct", 800, 0.01),
        response("without_jev", "correct", 2900, 0.001),
      ),
    ),
    "with_jev",
  );
  assert.equal(
    pickWinner(
      turn(
        response("with_jev", "correct", 800, 0.01),
        response("without_jev", "correct", 800, 0.001),
      ),
    ),
    "without_jev",
  );
  assert.equal(
    pickWinner(
      turn(
        response("with_jev", "wrong", 800, 0.01),
        response("without_jev", "wrong", 800, 0.01),
      ),
    ),
    "tie",
  );
});

test("a missing answer is never declared a winner", () => {
  assert.equal(
    pickWinner(turn(response("with_jev", "correct", 1, 0), null)),
    "tie",
  );
});

test("highlights split on the exact phrase only", () => {
  assert.deepEqual(splitHighlight("Halo dunia ramai", "dunia"), {
    before: "Halo ",
    match: "dunia",
    after: " ramai",
  });
  assert.equal(splitHighlight("Halo", "tidak ada"), null);
  assert.equal(splitHighlight("Halo", undefined), null);
});

test("deltas are written from Jev's side and flag a slower Jev honestly", async () => {
  const { turnDelta } = await import("../src/lib/lab/compare.ts");
  const faster = turnDelta(
    turn(
      response("with_jev", "correct", 800, 0.0004),
      response("without_jev", "wrong", 2900, 0.0061),
    ),
  );
  assert.equal(faster.latencyMs, 2100);
  assert.ok(Math.abs(faster.costUsd - 0.0057) < 1e-9);
  assert.equal(faster.accuracy, "jev_better");
  const slower = turnDelta(
    turn(
      response("with_jev", "correct", 3000, 0.01),
      response("without_jev", "correct", 1000, 0.001),
    ),
  );
  assert.ok(slower.latencyMs < 0 && slower.costUsd < 0);
  assert.equal(slower.accuracy, "both_right");
});

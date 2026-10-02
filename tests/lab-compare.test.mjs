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

test("summary totals and running accuracy follow the conversation", async () => {
  const { summarize } = await import("../src/lib/lab/compare.ts");
  const bad = response("without_jev", "wrong", 3000, 0.006);
  bad.review.flags = ["security"];
  const summary = summarize([
    turn(
      response("with_jev", "correct", 800, 0.0004),
      response("without_jev", "correct", 2900, 0.0061),
    ),
    turn(response("with_jev", "escalated", 1100, 0.0006), bad),
    turn(response("with_jev", "correct", 500, 0.0001), null),
  ]);
  assert.equal(summary.compared, 2);
  assert.equal(summary.jevBetterCount, 1);
  assert.equal(summary.withJev.correct, 2);
  assert.equal(summary.withoutJev.security, 1);
  assert.equal(summary.withJev.latencyMs, 1900);
  assert.deepEqual(
    summary.running.map((p) => p.withoutJev),
    [1, 0.5],
  );
});

test("pair deltas include ratios and survive zero costs and missing answers", async () => {
  const { turnDelta } = await import("../src/lib/lab/compare.ts");
  const delta = turnDelta(
    turn(
      response("with_jev", "correct", 820, 0.0004),
      response("without_jev", "correct", 2900, 0.0061),
    ),
  );
  assert.ok(Math.abs(delta.speedup - 2900 / 820) < 1e-9);
  assert.equal(delta.costSaving, 0.9344);
  assert.equal(delta.winner, "with_jev");

  const freeTemplate = turnDelta(
    turn(
      response("with_jev", "correct", 0, 0),
      response("without_jev", "wrong", 2700, 0),
    ),
  );
  assert.equal(freeTemplate.speedup, null);
  assert.equal(freeTemplate.costSaving, null);
  assert.equal(freeTemplate.accuracy, "jev_better");

  const pricier = turnDelta(
    turn(
      response("with_jev", "correct", 1000, 0.02),
      response("without_jev", "correct", 900, 0.01),
    ),
  );
  assert.equal(pricier.costSaving, -1);
  assert.equal(pricier.winner, "without_jev");

  assert.equal(
    turnDelta(turn(null, response("without_jev", "correct", 1, 0))),
    null,
  );
});

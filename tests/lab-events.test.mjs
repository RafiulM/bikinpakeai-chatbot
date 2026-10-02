import test from "node:test";
import assert from "node:assert/strict";
import {
  publishLabEvent,
  subscribeLabEvents,
} from "../src/lib/lab/events.server.ts";

test("live events reach only subscribers of the same conversation", () => {
  const seen = [];
  const other = [];
  const stop = subscribeLabEvents("conversation-a", (event) =>
    seen.push(event.type),
  );
  const stopOther = subscribeLabEvents("conversation-b", (event) =>
    other.push(event.type),
  );
  publishLabEvent({
    type: "analysis_failed",
    conversationId: "conversation-a",
    messageId: "m1",
    error: "x",
  });
  publishLabEvent({
    type: "comparison",
    conversationId: "conversation-a",
    messageId: "m1",
    delta: null,
  });
  stop();
  publishLabEvent({
    type: "analysis_failed",
    conversationId: "conversation-a",
    messageId: "m2",
    error: "y",
  });
  stopOther();
  assert.deepEqual(seen, ["analysis_failed", "comparison"]);
  assert.deepEqual(other, []);
});

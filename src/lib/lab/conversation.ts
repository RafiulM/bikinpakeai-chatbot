import type { ConversationTurn } from "./types";

/** Oldest first. Ties keep their original order (Array#sort is stable). */
export function sortTurns(turns: ConversationTurn[]) {
  return [...turns].sort(
    (a, b) =>
      new Date(a.message.createdAt).getTime() -
      new Date(b.message.createdAt).getTime(),
  );
}

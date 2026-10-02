import { SUGGESTED_QUESTIONS } from "@/lib/lab/suggestions";

/** Quick questions for an empty conversation, in display order. */
export function listSuggestions(limit: number) {
  return SUGGESTED_QUESTIONS.slice(0, limit);
}

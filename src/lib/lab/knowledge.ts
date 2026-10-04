import { KNOWLEDGE } from "./knowledge-base.ts";
import { SUPPORT_POLICY } from "./policy.ts";

// Shared knowledge base for both answer paths. The Jev path and the baseline
// path read the same text, so any difference in answers comes from Jev's
// classification, rules and routing, not from different knowledge. The
// baseline sends every entry; Jev sends only what matches.

export { KNOWLEDGE };

export interface KnowledgeEntry {
  id: string;
  product: string;
  topic: string;
  keywords: string[];
  answer: string;
}

export { SUPPORT_POLICY };

/**
 * Picks the most relevant entries by simple keyword overlap. When Jev has
 * read the product, its entries win ties against other products'.
 */
export function searchKnowledge(text: string, limit = 3, product?: string) {
  const lower = text.toLowerCase();
  return KNOWLEDGE.map((entry) => {
    const hits = entry.keywords.filter((keyword) =>
      lower.includes(keyword),
    ).length;
    const boost = hits > 0 && entry.product === product ? 0.5 : 0;
    return { entry, score: hits + boost };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entry);
}

/** Every entry for one product: Jev's narrower fallback when nothing matched. */
export function productKnowledge(product: string) {
  return KNOWLEDGE.filter((entry) => entry.product === product);
}

export function knowledgeAsText(entries = KNOWLEDGE) {
  return entries
    .map((entry) => `- [${entry.product}] ${entry.topic}: ${entry.answer}`)
    .join("\n");
}

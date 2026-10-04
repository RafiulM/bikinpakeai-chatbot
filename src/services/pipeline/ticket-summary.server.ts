import { generateText } from "ai";
import {
  summarizeConversation,
  type SummaryMessage,
} from "@/lib/lab/ticket-summary";
import { aiConfig, NO_REASONING, openrouter } from "./ai.server";

// Briefing for a new ticket. With OpenRouter the fast model writes it from the
// conversation; the local summary is used without a key or when the model
// fails, so a ticket is never left without a briefing.

export async function ticketBriefing(messagesInOrder: SummaryMessage[]) {
  const local = summarizeConversation(messagesInOrder);
  if (!aiConfig.enabled) return local;
  try {
    const transcript = messagesInOrder
      .map((message, index) => `${index + 1}. ${message.content}`)
      .join("\n");
    const result = await generateText({
      model: openrouter().chat(aiConfig.models.fast, {
        reasoning: NO_REASONING,
      }),
      instructions:
        "Ringkas masalah pelanggan untuk agen support dalam 2 sampai 4 poin pendek berbahasa Indonesia. Satu poin per baris, tanpa nomor atau tanda baca pembuka. Jangan menyalin data sensitif.",
      prompt: transcript,
      maxOutputTokens: 200,
      temperature: 0.2,
      maxRetries: 1,
      abortSignal: AbortSignal.timeout(aiConfig.modelTimeoutMs),
    });
    const points = result.text
      .split("\n")
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((line) => line.length > 0)
      .slice(0, 4);
    return points.length >= 2 ? points : local;
  } catch {
    return local;
  }
}

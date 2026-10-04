import { KNOWLEDGE, SUPPORT_POLICY } from "@/lib/lab/knowledge";
import { TEMPLATE_IDS, type AgentConfig } from "@/lib/lab/types";
import { getAiSettings } from "./ai-settings.service.server";
import { REASONING_BUDGET_TOKENS } from "./pipeline/ai.server";
import {
  ANSWER_MAX_TOKENS,
  ANSWER_TEMPERATURE,
  BASELINE_INSTRUCTIONS,
  JEV_DOC_LIMIT,
  JEV_HANDLER_INSTRUCTIONS,
  TEMPLATES,
} from "./pipeline/answers.server";

// What the customer-support agent is given, read from the pipeline's own
// constants so the Konfigurasi screen can never drift from what is sent.

const POLICY = "{{kebijakan}}";
const DOCS = "{{dokumentasi}}";

export async function getAgentConfig(userId: string): Promise<AgentConfig> {
  const { source, models } = await getAiSettings(userId);
  return {
    source,
    models,
    answer: {
      maxOutputTokens: ANSWER_MAX_TOKENS,
      temperature: ANSWER_TEMPERATURE,
      reasoningTokens: REASONING_BUDGET_TOKENS,
      docLimit: JEV_DOC_LIMIT,
    },
    instructions: {
      with_jev: JEV_HANDLER_INSTRUCTIONS(DOCS, POLICY),
      without_jev: BASELINE_INSTRUCTIONS(DOCS, POLICY),
    },
    policy: SUPPORT_POLICY.split("\n"),
    knowledge: KNOWLEDGE,
    templates: TEMPLATE_IDS.map((id) => ({
      id,
      text:
        id === "escalated"
          ? TEMPLATES.escalated("{{kode tiket}}")
          : TEMPLATES[id],
    })),
  };
}

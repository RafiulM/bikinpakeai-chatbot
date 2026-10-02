import { buildSummaryFile } from "@/lib/lab/summary-export";
import type { SummaryExportInput } from "@/validators/exports";
import { getConversation } from "./conversations.service.server";
import {
  getTestRunReport,
  listLatestRunPerSet,
  listTestRuns,
} from "./test-runs.service.server";

// Export files built from stored data with the same pure builders the browser
// uses, so a downloaded file matches what the screens show.

export type SummaryExportResult =
  | { kind: "not_found"; what: "conversation" | "test_run" }
  | { kind: "file"; fileName: string; mimeType: string; content: string };

/** The comparison summary file for the caller's conversation and/or run. */
export async function buildSummaryExport(
  userId: string,
  input: SummaryExportInput,
): Promise<SummaryExportResult> {
  const conversation = input.conversationId
    ? await getConversation(userId, input.conversationId)
    : null;
  if (input.conversationId && !conversation)
    return { kind: "not_found", what: "conversation" };

  const runId =
    input.testRun === "latest"
      ? (await listTestRuns(userId, 1, "done"))[0]?.runId
      : input.testRun;
  const report = runId ? await getTestRunReport(userId, runId) : null;
  if (input.testRun && input.testRun !== "latest" && !report)
    return { kind: "not_found", what: "test_run" };

  // Asking for test results also brings the recap of every test set.
  const runs = input.testRun ? await listLatestRunPerSet(userId) : [];
  return {
    kind: "file",
    ...buildSummaryFile({ conversation, report, runs }, input.format),
  };
}

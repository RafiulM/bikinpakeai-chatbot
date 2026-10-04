import { eq } from "drizzle-orm";
import { db } from "@/db/index.server";
import { accountDisplaySettings } from "@/db/schema";
import type { DisplaySettings } from "@/lib/lab/types";
import type { SaveDisplaySettingsInput } from "@/validators/settings";

// How the account's Chat looks: demo mode (both answers with their review)
// or the plain customer chatbot for one path. Accounts without a saved row
// start in demo mode.

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  demoMode: true,
  chatbot: "with_jev",
};

function fromRow(row: typeof accountDisplaySettings.$inferSelect) {
  return {
    demoMode: row.demoMode,
    chatbot: row.chatbot === "without_jev" ? "without_jev" : "with_jev",
  } satisfies DisplaySettings;
}

export async function getDisplaySettings(
  userId: string,
): Promise<DisplaySettings> {
  const [row] = await db
    .select()
    .from(accountDisplaySettings)
    .where(eq(accountDisplaySettings.userId, userId))
    .limit(1);
  return row ? fromRow(row) : { ...DEFAULT_DISPLAY_SETTINGS };
}

export async function saveDisplaySettings(
  userId: string,
  input: SaveDisplaySettingsInput,
): Promise<DisplaySettings> {
  const [row] = await db
    .insert(accountDisplaySettings)
    .values({ userId, ...input })
    .onConflictDoUpdate({ target: accountDisplaySettings.userId, set: input })
    .returning();
  return fromRow(row);
}

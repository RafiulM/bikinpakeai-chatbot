import { auth } from "@/lib/auth.server";
import type { Permissions } from "@/lib/permissions";

// Server-only session helpers. Routes reach these through the server
// functions in src/lib/session.ts, never by importing this file directly.
export function getSession(headers: Headers) {
  return auth.api.getSession({ headers });
}

// Reads the stored role, so a revoked role takes effect on the next request
// instead of when the session expires.
export async function hasPermission(userId: string, permissions: Permissions) {
  const { success } = await auth.api.userHasPermission({
    body: { userId, permissions },
  });
  return success;
}

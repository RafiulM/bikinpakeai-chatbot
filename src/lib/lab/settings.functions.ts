import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSession } from "@/lib/session.server";
import {
  DEFAULT_DISPLAY_SETTINGS,
  getDisplaySettings,
} from "@/services/display-settings.service.server";

// Server function for route loaders: the account's display settings, read
// during server rendering so Chat never flashes the wrong layout. Checks the
// session itself.
export const loadDisplaySettingsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession(getRequestHeaders() as unknown as Headers);
    if (!session) return { ...DEFAULT_DISPLAY_SETTINGS };
    return getDisplaySettings(session.user.id);
  },
);

import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getSession, hasPermission } from "@/lib/session.server";
import type { Permissions } from "@/lib/permissions";

// Server functions: the handler bodies run only on the server, so route files
// can import this module freely. Use them in beforeLoad/loader, then throw
// redirect() or notFound() there. A layout check alone does not protect API
// routes; those use withApiSession in src/lib/api.server.ts.
function requestHeaders() {
  return getRequestHeaders() as unknown as Headers;
}

export const getSessionFn = createServerFn({ method: "GET" }).handler(() =>
  getSession(requestHeaders()),
);

export type Session = NonNullable<Awaited<ReturnType<typeof getSessionFn>>>;

export const hasPermissionFn = createServerFn({ method: "GET" })
  .validator((permissions: Permissions) => permissions)
  .handler(async ({ data }) => {
    const session = await getSession(requestHeaders());
    return session ? hasPermission(session.user.id, data) : false;
  });

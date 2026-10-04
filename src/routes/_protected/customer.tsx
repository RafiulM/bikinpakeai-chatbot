import { createFileRoute, redirect } from "@tanstack/react-router";

// The customer chat now lives in the side-by-side main view. Old links,
// including ?c= and a #turn- anchor, land there.
export const Route = createFileRoute("/_protected/customer")({
  beforeLoad: ({ location }) => {
    const search = new URLSearchParams(location.searchStr).toString();
    throw redirect({
      href: `/compare${search ? `?${search}` : ""}${location.hash ? `#${location.hash}` : ""}`,
      replace: true,
    });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";

// The root has no page of its own: the app starts at the signed-in screen.
// Add a public landing page here only when your product needs one.
export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    throw redirect({ to: context.session ? siteConfig.homePath : "/sign-in" });
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/_auth/sign-in")({
  head: () => ({ meta: [{ title: `Sign in | ${siteConfig.name}` }] }),
  component: () => <AuthForm mode="sign-in" />,
});

import type { ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { getSessionFn } from "@/lib/session";
import globalsCss from "@/styles/globals.css?url";

export const Route = createRootRoute({
  // One session read per navigation, shared with every route as context.
  // Layouts decide what to do with it; API routes check on their own.
  beforeLoad: async () => ({ session: await getSessionFn() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${siteConfig.name} — Your starting point` },
      { name: "description", content: siteConfig.description },
    ],
    links: [
      { rel: "stylesheet", href: globalsCss },
      { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Providers>
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-foreground p-3 text-background focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
          >
            Skip to content
          </a>
          {children}
        </Providers>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="mx-auto max-w-lg px-6 py-24">
      <p className="mb-3 font-mono text-sm text-primary">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">
        This page isn’t here
      </h1>
      <p className="my-4 text-muted-foreground">
        Head back to your starting point.
      </p>
      <Button asChild>
        <Link to="/">Go home</Link>
      </Button>
    </main>
  );
}

function ErrorPage() {
  const router = useRouter();
  return (
    <main id="main-content" className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="my-4 leading-7 text-muted-foreground">
        Try loading this page again. If it keeps happening, check the terminal
        running your app for details.
      </p>
      <Button onClick={() => router.invalidate()}>Try again</Button>
    </main>
  );
}

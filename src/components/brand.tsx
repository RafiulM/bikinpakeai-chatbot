import { Link } from "@tanstack/react-router";
import { Layers2 } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label={`${siteConfig.name} home`}
    >
      <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
        <Layers2 className="size-4" aria-hidden="true" />
      </span>
      <span>
        {siteConfig.name}
        <span className="ml-2 font-normal text-muted-foreground">
          / starter
        </span>
      </span>
    </Link>
  );
}

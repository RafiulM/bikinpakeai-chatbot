import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";

export function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 rounded-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      aria-label={`${siteConfig.name} home`}
    >
      <span>
        Bikinpakeai
        <span className="ml-2 font-normal text-muted-foreground">
          Support Lab
        </span>
      </span>
    </Link>
  );
}

import starter from "../../starter.config.json";

// Change these values to give every page your app's name and description.
export const siteConfig = {
  id: starter.id,
  name: starter.name,
  description: starter.description,
  homePath: "/app",
} as const;

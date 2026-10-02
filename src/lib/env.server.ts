import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url().refine((value) => {
    const url = new URL(value);
    return (
      ["postgres:", "postgresql:"].includes(url.protocol) &&
      Boolean(url.hostname) &&
      url.pathname.length > 1 &&
      !url.hash
    );
  }, "Set DATABASE_URL to a PostgreSQL connection string or run npm run setup."),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "Run npm run setup to generate a secret."),
  BETTER_AUTH_URL: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["http:", "https:"].includes(url.protocol) &&
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password
      );
    }, "Use an origin, e.g. http://localhost:3000.")
    .default("http://localhost:3000"),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
});

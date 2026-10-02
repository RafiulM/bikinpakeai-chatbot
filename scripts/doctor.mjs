import { existsSync, readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { Pool } from "pg";
import { assertNode, loadEnvironment, root } from "./lib.mjs";
import { databaseUrl, databaseError } from "./postgres.mjs";

let failures = 0;
async function check(label, fn) {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    failures++;
    console.error(`✗ ${label}: ${error.message}`);
  }
}

await loadEnvironment();
await check("Node.js", assertNode);
await check("Auth secret", () => {
  if ((process.env.BETTER_AUTH_SECRET?.length ?? 0) < 32)
    throw new Error(
      "Run npm run setup or set BETTER_AUTH_SECRET to 32+ characters.",
    );
});
await check("Auth URL", () => {
  const url = new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw new Error(
      "BETTER_AUTH_URL must be an origin such as http://localhost:3000.",
    );
});
await check("PostgreSQL connection and authentication tables", async () => {
  const pool = new Pool({
    connectionString: databaseUrl(),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () => {});
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
      [["user", "session", "account", "verification"]],
    );
    if (result.rowCount !== 4) throw new Error("MISSING_TABLES");
  } catch (error) {
    if (error.message === "MISSING_TABLES")
      throw new Error(
        "Run npm run db:migrate to create the authentication tables.",
      );
    throw new Error(databaseError(error));
  } finally {
    await pool.end();
  }
});
await check("Project instructions and skills", () => {
  for (const path of [
    "AGENTS.md",
    "agent.md",
    "compose.dev.yaml",
    ".agents/skills/dev-database/SKILL.md",
    ".agents/skills/build-feature/SKILL.md",
    ".agents/skills/create-variant/SKILL.md",
    ".agents/skills/starter-setup/SKILL.md",
  ]) {
    if (!existsSync(resolve(root, path))) throw new Error(`Missing ${path}`);
  }
});
await check("Context7 configuration files", () => {
  for (const path of [
    ".mcp.json",
    ".cursor/mcp.json",
    ".vscode/mcp.json",
    ".codex/config.toml",
  ]) {
    if (!existsSync(resolve(root, path))) throw new Error(`Missing ${path}`);
  }
});

// A reminder, not a failure: fresh copies must pass, but a finished app should
// not ship the starter's blank canvas. build-feature removes it with the app's
// first real screen.
function placeholders(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) found.push(...placeholders(path));
    else if (
      /\.(tsx|jsx)$/.test(entry.name) &&
      readFileSync(path, "utf8").includes("data-starter-placeholder")
    )
      found.push(relative(root, path));
  }
  return found;
}
const remaining = placeholders(resolve(root, "src"));
if (remaining.length)
  console.warn(
    `! Starter placeholder still present: ${remaining.join(", ")}. Replace it with your app's first screen (build-feature skill), then delete e2e/starter.spec.ts.`,
  );
console.log(
  "\nContext7 is checked inside your AI editor; this command checks local configuration and PostgreSQL only.",
);
process.exitCode = failures ? 1 : 0;

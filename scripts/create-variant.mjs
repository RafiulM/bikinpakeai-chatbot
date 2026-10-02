import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { pathToFileURL } from "node:url";
import { root } from "./lib.mjs";

// Explicit source paths prevent accidental copying of uploads, secrets, or local tools.
const sources = [
  "src",
  "scripts",
  "tests",
  "e2e",
  "drizzle",
  "docs",
  ".agents/skills",
  ".codex/config.toml",
  ".cursor/mcp.json",
  ".cursor/rules",
  ".vscode/mcp.json",
  ".github/workflows",
  ".github/copilot-instructions.md",
  ".mcp.json",
  ".env.example",
  ".gitignore",
  ".nvmrc",
  ".prettierrc.json",
  ".prettierignore",
  "AGENTS.md",
  "agent.md",
  "CLAUDE.md",
  "README.md",
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "package.json",
  "package-lock.json",
  "starter.config.json",
  "components.json",
  "compose.dev.yaml",
  "compose.test.yaml",
  "tsconfig.json",
  "vite.config.ts",
  "public",
  "eslint.config.mjs",
  "drizzle.config.ts",
  "playwright.config.ts",
];

function allowed(path) {
  const name = basename(path);
  if (
    (name.startsWith(".env") && name !== ".env.example") ||
    /\.(db|sqlite)(-(shm|wal))?$/.test(name) ||
    name.endsWith(".log")
  )
    return false;
  return ![
    "node_modules",
    ".git",
    ".output",
    ".nitro",
    ".tanstack",
    ".data",
    ".DS_Store",
    "test-results",
    "playwright-report",
  ].includes(name);
}

function copySource(source, destination) {
  if (!existsSync(source) || !allowed(source)) return;
  const stat = lstatSync(source);
  if (stat.isSymbolicLink()) return;
  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const name of readdirSync(source))
      copySource(resolve(source, name), resolve(destination, name));
  } else if (stat.isFile()) {
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
  }
}

export function createVariant(slug, destination, sourceRoot = root) {
  if (
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug || "") ||
    slug.length > 64 ||
    !destination
  ) {
    throw new Error(
      "Usage: npm run create:variant -- dashboard ../my-dashboard (lowercase slug, up to 64 characters).",
    );
  }
  const source = realpathSync(sourceRoot);
  const requestedTarget = resolve(destination);
  if (existsSync(requestedTarget))
    throw new Error(
      "Destination already exists. Choose a new folder; nothing was overwritten.",
    );
  // Resolve the parent to reject paths that enter the source through a symlink.
  if (!existsSync(dirname(requestedTarget)))
    throw new Error("The destination's parent folder must already exist.");
  const target = resolve(
    realpathSync(dirname(requestedTarget)),
    basename(requestedTarget),
  );
  const distance = relative(source, target);
  if (
    !distance ||
    (!distance.startsWith(`..${sep}`) &&
      distance !== ".." &&
      !isAbsolute(distance))
  ) {
    throw new Error("Choose a destination outside this starter folder.");
  }
  mkdirSync(target);
  for (const entry of sources)
    copySource(resolve(source, entry), resolve(target, entry));
  const readJson = (name) =>
    JSON.parse(readFileSync(resolve(target, name), "utf8"));
  const writeJson = (name, value) =>
    writeFileSync(resolve(target, name), `${JSON.stringify(value, null, 2)}\n`);
  const config = readJson("starter.config.json");
  const title = slug
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
  writeJson("starter.config.json", {
    ...config,
    id: slug,
    name: title,
    description: `${title}, built on the base starter.`,
  });
  const pkg = readJson("package.json");
  pkg.name = `ngodingpakeai-${slug}`;
  writeJson("package.json", pkg);
  if (existsSync(resolve(target, "package-lock.json"))) {
    const lock = readJson("package-lock.json");
    lock.name = pkg.name;
    if (lock.packages?.[""]) lock.packages[""].name = pkg.name;
    writeJson("package-lock.json", lock);
  }
  const readme = readFileSync(resolve(target, "README.md"), "utf8");
  writeFileSync(
    resolve(target, "README.md"),
    `# ${title} starter\n\nDerived from the TanStack Start + PostgreSQL base ${config.baseVersion}. This is a fresh foundation; add the ${slug} features next.\n\n${readme.replace(/^# .+\n/, "")}`,
  );
  writeFileSync(
    resolve(target, "docs/variant.md"),
    `# ${title}\n\nBase version: ${config.baseVersion}\n\nPurpose: describe this derivative's audience and primary workflow.\n\nChanges from base: identity only. Product features have not been implemented yet.\n`,
  );
  return target;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const target = createVariant(process.argv[2], process.argv[3]);
    console.log(
      `\nCreated ${target}\n\nOpen that folder, run npm run setup, then npm run dev.\nThis copies the base; use the create-variant skill to build its product features.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

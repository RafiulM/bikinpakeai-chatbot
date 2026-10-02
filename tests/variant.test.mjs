import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { createVariant } from "../scripts/create-variant.mjs";

function fixture(parent) {
  const source = resolve(parent, "base");
  const files = {
    "package.json": JSON.stringify({ name: "base", version: "0.1.0" }),
    "package-lock.json": JSON.stringify({
      name: "base",
      packages: { "": { name: "base" } },
    }),
    "starter.config.json": JSON.stringify({
      id: "base",
      name: "Base",
      baseVersion: "0.1.0",
    }),
    "README.md": "# Base\n\nSetup instructions.\n",
    "docs/architecture.md": "The architecture.",
    "agent.md": "Read AGENTS.md.\n",
    "AGENTS.md": "Project guidance.\n",
    ".agents/skills/dev-database/SKILL.md": "Database workflow.\n",
    "compose.dev.yaml": "services: {}\n",
    "compose.test.yaml": "services: {}\n",
    "src/routes/index.tsx": "export const Route = {};",
    ".env.example": "BETTER_AUTH_SECRET=\n",
    ".env.local": "PRIVATE=do-not-copy",
    "src/.env.local": "PRIVATE=also-do-not-copy",
    "src/nested.db": "private-data",
    ".data/app.db": "private-data",
    ".git/config": "private-remote",
    "uploads/private.txt": "private-upload",
    ".codex/config.toml": "[mcp_servers.context7]\n",
    ".codex/config.local.toml": "private-editor-settings",
  };
  for (const [name, value] of Object.entries(files)) {
    const path = resolve(source, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, value);
  }
  return source;
}

test("a derivative preserves base files and provenance while excluding local state", () => {
  const parent = mkdtempSync(resolve(tmpdir(), "starter-variant-"));
  try {
    const source = fixture(parent);
    symlinkSync(
      resolve(source, ".env.local"),
      resolve(source, "src/leaked-secret"),
    );
    const target = createVariant(
      "dashboard",
      resolve(parent, "dashboard"),
      source,
    );
    assert.equal(
      JSON.parse(readFileSync(resolve(target, "package.json"))).name,
      "ngodingpakeai-dashboard",
    );
    assert.equal(
      JSON.parse(readFileSync(resolve(target, "package-lock.json"))).packages[
        ""
      ].name,
      "ngodingpakeai-dashboard",
    );
    assert.equal(
      JSON.parse(readFileSync(resolve(target, "starter.config.json")))
        .baseVersion,
      "0.1.0",
    );
    assert.ok(existsSync(resolve(target, "src/routes/index.tsx")));
    assert.ok(existsSync(resolve(target, ".env.example")));
    assert.ok(existsSync(resolve(target, "compose.dev.yaml")));
    assert.ok(existsSync(resolve(target, "agent.md")));
    assert.ok(existsSync(resolve(target, "AGENTS.md")));
    assert.ok(
      existsSync(resolve(target, ".agents/skills/dev-database/SKILL.md")),
    );
    assert.ok(existsSync(resolve(target, "compose.test.yaml")));
    for (const name of [
      ".env.local",
      "src/.env.local",
      "src/nested.db",
      "src/leaked-secret",
      ".data",
      ".git",
      "uploads",
      ".codex/config.local.toml",
    ])
      assert.ok(!existsSync(resolve(target, name)), name);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("a derivative refuses overwrites, nested destinations, and paths through a symlink", () => {
  const parent = mkdtempSync(resolve(tmpdir(), "starter-variant-"));
  try {
    const source = fixture(parent);
    assert.throws(
      () => createVariant("dashboard", source, source),
      /already exists/,
    );
    assert.throws(
      () => createVariant("dashboard", resolve(source, "child"), source),
      /outside/,
    );
    symlinkSync(source, resolve(parent, "alias"), "dir");
    assert.throws(
      () => createVariant("dashboard", resolve(parent, "alias/child"), source),
      /outside/,
    );
    assert.throws(
      () => createVariant("../invalid", resolve(parent, "new"), source),
      /Usage/,
    );
    assert.ok(!existsSync(resolve(source, "child")));
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

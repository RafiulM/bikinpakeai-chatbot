// Seeds demo data into the running app: npm run db:seed [-- --url <origin>]
//
// 1. Applies migrations, which also load the reference data (scenarios and
//    the three built-in test sets).
// 2. Signs in to a demo account, creating it on first use. Its sign-in details
//    are kept in .demo-account.json (git-ignored) so you can log in with it.
// 3. Calls POST /api/demo/seed as that account: a new conversation from
//    ready-made scenarios, its tickets, and a run of every test set.
//
// The app must be running (npm run dev). With an OpenRouter key saved in the
// demo account's Pengaturan, or OPENROUTER_API_KEY set, real models answer.
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { loadEnvironment, root, runNpm } from "./lib.mjs";

await loadEnvironment();
const urlFlag = process.argv.indexOf("--url");
const origin = new URL(
  urlFlag > -1
    ? process.argv[urlFlag + 1]
    : process.env.BETTER_AUTH_URL || "http://localhost:3000",
).origin;
const accountFile = resolve(root, ".demo-account.json");

runNpm(["run", "db:migrate"]);

try {
  await fetch(origin, { redirect: "manual" });
} catch {
  console.error(
    `The app is not answering at ${origin}. Start it with npm run dev, or pass --url <origin>.`,
  );
  process.exit(1);
}

/** POST as JSON from the app's own origin; retries once after a rate limit. */
async function post(path, body, cookie) {
  const send = () =>
    fetch(`${origin}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        ...(cookie && { Cookie: cookie }),
      },
      body: JSON.stringify(body),
    });
  let response = await send();
  if (response.status === 429) {
    const seconds = Number(response.headers.get("retry-after") || 10);
    await delay((Math.min(seconds, 30) + 0.5) * 1000);
    response = await send();
  }
  return response;
}

const cookieOf = (response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

let account = existsSync(accountFile)
  ? JSON.parse(readFileSync(accountFile, "utf8"))
  : null;
let signedIn = account
  ? await post("/api/auth/sign-in/email", {
      email: account.email,
      password: account.password,
    })
  : null;

if (!signedIn?.ok) {
  account = {
    name: "Demo Bikinpakeai",
    email: `demo-${randomBytes(3).toString("hex")}@bikinpakeai.test`,
    password: `Demo-${randomBytes(9).toString("base64url")}!7`,
  };
  signedIn = await post("/api/auth/sign-up/email", account);
  if (!signedIn.ok) {
    console.error(
      `Could not create the demo account (HTTP ${signedIn.status}). Check that ${origin} matches BETTER_AUTH_URL.`,
    );
    process.exit(1);
  }
  writeFileSync(accountFile, `${JSON.stringify(account, null, 2)}\n`, {
    mode: 0o600,
  });
  console.log(
    `Created demo account ${account.email} (details in .demo-account.json).`,
  );
} else {
  console.log(`Signed in as demo account ${account.email}.`);
}

console.log("Running ready-made scenarios through both answer paths…");
const seeded = await post("/api/demo/seed", {}, cookieOf(signedIn));
if (!seeded.ok) {
  console.error(`Seeding failed (HTTP ${seeded.status}).`);
  process.exit(1);
}
const { data } = await seeded.json();
console.log(
  `Conversation ${data.conversation.code}: ${data.messages} messages, ${data.tickets} tickets${data.failed ? `, ${data.failed} failed` : ""}.`,
);
if (data.testSets.length)
  console.log(
    `Test sets now running one after another in the background: ${data.testSets.join(", ")}.`,
  );
console.log(
  `Open ${origin}/compare?c=${data.conversation.id} after signing in as the demo account.`,
);

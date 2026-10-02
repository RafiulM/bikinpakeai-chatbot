import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { assertNode, root, runNpm } from "./lib.mjs";

try {
  assertNode();
  console.log("\nSetting up your starter…\n");
  runNpm([existsSync(resolve(root, "package-lock.json")) ? "ci" : "install"]);
  runNpm(["run", "predev"]);
  runNpm(["run", "doctor"]);
  console.log(
    "\nReady. Run npm run dev and open the local URL it reports. If you change the app port, match BETTER_AUTH_URL to that origin.\n",
  );
} catch (error) {
  console.error(`\nSetup stopped: ${error.message}`);
  process.exitCode = 1;
}

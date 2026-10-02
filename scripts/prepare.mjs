import { assertNode, prepareEnvironment, runNpm } from "./lib.mjs";

try {
  assertNode();
  await prepareEnvironment();
  runNpm(["run", "db:up"]);
  runNpm(["run", "db:migrate"]);
} catch (error) {
  console.error(`Setup needs attention: ${error.message}`);
  process.exitCode = 1;
}

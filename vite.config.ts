import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

function authPort() {
  try {
    const url = new URL(process.env.BETTER_AUTH_URL || "http://localhost:3000");
    return Number(url.port) || (url.protocol === "https:" ? 443 : 80);
  } catch {
    return 3000;
  }
}

export default defineConfig(({ command, mode }) => {
  // Server modules read process.env. In development Vite only exposes VITE_*
  // to the browser, so loading the whole file here never leaks a secret.
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "")))
      if (process.env[key] === undefined) process.env[key] = value;
  }
  return {
    // Serve on BETTER_AUTH_URL's port so sign-in cookies and the API Origin
    // check match the URL you open. strictPort fails loudly instead of moving
    // to another port where sign-in would break.
    server: { port: authPort(), strictPort: true },
    // node-server emits .output/server/index.mjs, a portable Node server that
    // honors PORT and HOST. The Dockerfile ships only that folder.
    nitro: { preset: "node-server" },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart(),
      // Nitro is the deployment adapter; development uses Start's own server.
      command === "build" && nitro(),
      // React's plugin must come after Start's.
      viteReact(),
    ],
  };
});

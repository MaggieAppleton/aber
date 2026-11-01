import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Choices made in the jig are written to design/decisions.json so the agent can read them.
const DECISIONS = resolve(import.meta.dirname, "../design/decisions.json");

function decisionsStore(): Plugin {
  return {
    name: "decisions-store",
    configureServer(server) {
      server.middlewares.use("/api/decisions", (req, res) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", chunk => (body += chunk));
          req.on("end", () => {
            writeFileSync(DECISIONS, JSON.stringify(JSON.parse(body), null, 2) + "\n");
            res.end("ok");
          });
          return;
        }
        res.setHeader("content-type", "application/json");
        res.end(existsSync(DECISIONS) ? readFileSync(DECISIONS) : "{}");
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), decisionsStore()],
  // Serve the exported boards and screenshots at /space-and-motion/…
  publicDir: "../design",
});

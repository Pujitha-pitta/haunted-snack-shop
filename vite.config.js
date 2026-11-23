import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages: the single-player game (index.html) and the co-op party mode (party.html).
// In development, API calls are proxied to `npx wrangler dev` on port 8787.
export default defineConfig({
  base: "./", // relative asset paths so the same build works on Cloudflare and GitHub Pages
  server: { proxy: { "/api": "http://127.0.0.1:8787", "/.netlify/functions": "http://127.0.0.1:8787" } },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        party: fileURLToPath(new URL("./party.html", import.meta.url))
      }
    }
  }
});

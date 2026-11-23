import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// Two pages: the single-player game (index.html) and the co-op party mode (party.html).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        party: fileURLToPath(new URL("./party.html", import.meta.url))
      }
    }
  }
});

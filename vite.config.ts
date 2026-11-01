import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Game version (package.json) and build number (commit count), shown on the title screens.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
let build = "dev";
try { build = String(Number(execSync("git rev-list --count HEAD").toString().trim()) + 1); } catch { /* not a git checkout */ }

// `npm run build:single` makes one self-contained HTML file (for sharing / phone play).
const single = process.env.SINGLE === "1";

export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
  plugins: single ? [viteSingleFile()] : [],
  build: { outDir: single ? "dist-single" : "dist" },
  test: { globals: true, environment: "node" }
});

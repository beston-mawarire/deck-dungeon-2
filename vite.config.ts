import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Game version (package.json) and build number (commit count), shown on the title screens.
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };
let build = "dev";
try { build = execSync("git rev-list --count HEAD").toString().trim(); } catch { /* not a git checkout */ }

// `npm run build:single` makes one self-contained HTML file (for sharing / phone play).
const single = process.env.SINGLE === "1";

export default defineConfig({
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __APP_BUILD__: JSON.stringify(build) },
  plugins: [
    ...(single ? [viteSingleFile()] : []),
    // version.json sits next to the game; open pages poll it and reload themselves when a newer build is out.
    { name: "version-file", closeBundle() { writeFileSync(join(single ? "dist-single" : "dist", "version.json"), JSON.stringify({ version: pkg.version, build })); } }
  ],
  build: { outDir: single ? "dist-single" : "dist" },
  // The old room-choice game is kept in the code (nothing reaches it now), but its tests are parked.
  test: { globals: true, environment: "node", exclude: ["**/node_modules/**", "tests/sim.test.ts", "tests/auto.test.ts", "tests/crossroads.test.ts", "tests/transform.test.ts"] }
});

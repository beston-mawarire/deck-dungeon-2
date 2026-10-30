import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:single` makes one self-contained HTML file (for sharing / phone play).
const single = process.env.SINGLE === "1";

export default defineConfig({
  base: "./",
  plugins: single ? [viteSingleFile()] : [],
  build: { outDir: single ? "dist-single" : "dist" },
  test: { globals: true, environment: "node" }
});

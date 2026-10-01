import { defineConfig } from "tsup";

// ESM for Next.js and Expo, CJS for Node scripts.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});

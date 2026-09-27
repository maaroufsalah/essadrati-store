import { defineConfig } from "tsup";

// ESM for Next.js and Expo, CJS for the Medusa backend.
export default defineConfig({
  entry: ["src/index.ts", "src/defaults.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});

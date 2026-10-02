import { defineConfig } from "tsup";

// ESM for Next.js and Expo, CJS for the Medusa backend. `client` is the
// zod-free entry for browser bundles.
export default defineConfig({
  entry: ["src/index.ts", "src/client.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});

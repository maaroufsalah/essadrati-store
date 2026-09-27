// Node services: Medusa backend and scripts.
import { defineConfig } from "eslint/config";
import globals from "globals";
import { base } from "./base.js";

export const node = defineConfig(base, {
  languageOptions: { globals: { ...globals.node } },
  rules: { "no-console": "off" },
});

export default node;

// Next.js 15 storefront: React hooks, a11y, Next rules and kit guard rails.
import nextPlugin from "@next/eslint-plugin-next";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { base } from "./base.js";
import { guards } from "./guards.js";

export const next = defineConfig(
  base,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
    },
  },
  guards,
);

export default next;

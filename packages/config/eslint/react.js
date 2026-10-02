// React apps without the storefront guard rails (Medusa admin plugin):
// typed base rules, React hooks and a11y.
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import { defineConfig } from "eslint/config";
import globals from "globals";
import { base } from "./base.js";

export const react = defineConfig(base, {
  languageOptions: { globals: { ...globals.browser } },
  plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
  rules: {
    ...reactHooks.configs.recommended.rules,
    ...jsxA11y.flatConfigs.recommended.rules,
  },
});

export default react;

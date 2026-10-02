import base from "@nocido/config/eslint/base";

export default [
  { ignores: ["playwright-report/**", "test-results/**", ".lighthouseci/**", "lighthouserc.cjs"] },
  ...base,
];

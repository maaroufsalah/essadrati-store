/** Conventional commits with the monorepo's scopes. */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "admin",
        "api-client",
        "backend",
        "config",
        "deps",
        "docs",
        "infra",
        "mobile",
        "release",
        "seo",
        "storefront",
        "theme",
        "tracking",
        "types",
      ],
    ],
    "body-max-line-length": [1, "always", 100],
  },
};

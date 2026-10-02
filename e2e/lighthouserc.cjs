/**
 * Lighthouse CI, mobile (Lighthouse default: Moto G Power emulation with
 * simulated 4G throttling) on the home, category and product pages.
 * Performance must reach 90. Reports stay on disk (.lighthouseci): no
 * third-party upload service.
 * LHCI_BASE_URL, LHCI_CATEGORY and LHCI_PRODUCT pick the pages;
 * LHCI_CHROME_PATH points to a local Chrome when needed.
 */
const base = process.env.LHCI_BASE_URL ?? "http://localhost:3000";
const category = process.env.LHCI_CATEGORY ?? "asal-hor";
const product = process.env.LHCI_PRODUCT ?? "asal-ferrane";

module.exports = {
  ci: {
    collect: {
      url: [`${base}/fr`, `${base}/fr/c/${category}`, `${base}/fr/p/${product}`],
      numberOfRuns: Number(process.env.LHCI_RUNS ?? 3),
      ...(process.env.LHCI_CHROME_PATH ? { chromePath: process.env.LHCI_CHROME_PATH } : {}),
      settings: {
        chromeFlags: "--headless=new --no-sandbox",
        // Local and CI servers speak HTTP/1.1; production Nginx serves HTTP/2.
        skipAudits: ["uses-http2"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:accessibility": ["warn", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:seo": ["warn", { minScore: 0.9, aggregationMethod: "median-run" }],
        "categories:best-practices": ["warn", { minScore: 0.9, aggregationMethod: "median-run" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci" },
  },
};

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Uploaded media (logos, products) are served from the backend host. */
function mediaPattern(): { protocol: "http" | "https"; hostname: string; port: string } | null {
  const raw = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
  if (!raw || !URL.canParse(raw)) return null;
  const url = new URL(raw);
  return {
    protocol: url.protocol === "https:" ? "https" : "http",
    hostname: url.hostname,
    port: url.port,
  };
}

const media = mediaPattern();

const nextConfig: NextConfig = {
  // Standalone output is for the Docker image (Linux). On Windows its
  // pnpm symlinks need Developer Mode, so local builds skip it.
  output: process.platform === "win32" ? undefined : "standalone",
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: media ? [{ ...media, pathname: "/**" }] : [],
  },
  experimental: {
    // CSS inlined in the HTML (about 15 kB): no render-blocking stylesheet
    // request before the first paint on mobile (LCP).
    inlineCss: true,
  },
};

export default withNextIntl(nextConfig);

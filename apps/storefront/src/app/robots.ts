import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

/**
 * Crawl everything public; keep checkout, order pages, the UI kit and the
 * API out of the index. /api/og stays allowed for link previews.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/api/og/"],
      disallow: ["/api/", "/*/checkout", "/*/order", "/*/ui-kit"],
    },
    sitemap: siteUrl("/sitemap.xml"),
  };
}

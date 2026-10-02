import "server-only";
import { createStoreClient } from "@nocido/api-client";
import type { Page, PageSummary } from "@nocido/types";
import { cache } from "react";
import { publicEnv } from "./env";
import { medusaServerUrl } from "./server-env";

/** CMS pages are cached for an hour; the backend revalidates the `pages` tag on save. */
const PAGES_REVALIDATE = 3600;

const client = () =>
  createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });

/** Published pages without content, by footer rank. Empty when the API fails. */
export const listPages = cache(async (): Promise<PageSummary[]> => {
  const result = await client().listPages({ next: { revalidate: PAGES_REVALIDATE } });
  if (!result.ok) {
    console.error(`[pages] list failed: ${result.error.code}`, result.error.message);
    return [];
  }
  return [...result.data].sort((a, b) => a.footerRank - b.footerRank);
});

/** One published page, or null (unknown handle, draft, or API failure). */
export const getPage = cache(async (handle: string): Promise<Page | null> => {
  const result = await client().getPage(handle, { next: { revalidate: PAGES_REVALIDATE } });
  if (result.ok) return result.data;
  if (result.error.code !== "notFound") {
    console.error(`[pages] ${handle} failed: ${result.error.code}`, result.error.message);
  }
  return null;
});

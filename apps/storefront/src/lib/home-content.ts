import "server-only";
import { createStoreClient } from "@nocido/api-client";
import type { CategoryBanner, HeroSlide } from "@nocido/types";
import { activeByRank } from "@nocido/types/client";
import { cache } from "react";
import { publicEnv } from "./env";
import { medusaServerUrl } from "./server-env";

/** Cached for an hour; the backend revalidates the tags after each admin write. */
const HOME_REVALIDATE = 3600;

const client = () =>
  createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });

/** Active hero slides by rank. Empty when the API fails (the editorial hero takes over). */
export const getHeroSlides = cache(async (): Promise<HeroSlide[]> => {
  const result = await client().listHeroSlides({ next: { revalidate: HOME_REVALIDATE } });
  if (!result.ok) {
    console.error(`[home] hero slides failed: ${result.error.code}`, result.error.message);
    return [];
  }
  if (result.skipped) console.warn(`[home] ${result.skipped} invalid hero slide(s) skipped`);
  return activeByRank(result.data);
});

/** Active category banners by rank. Empty when the API fails (the category grid takes over). */
export const getCategoryBanners = cache(async (): Promise<CategoryBanner[]> => {
  const result = await client().listCategoryBanners({ next: { revalidate: HOME_REVALIDATE } });
  if (!result.ok) {
    console.error(`[home] category banners failed: ${result.error.code}`, result.error.message);
    return [];
  }
  if (result.skipped) console.warn(`[home] ${result.skipped} invalid category banner(s) skipped`);
  return activeByRank(result.data);
});

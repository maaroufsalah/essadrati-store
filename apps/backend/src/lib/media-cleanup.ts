import type { IFileModuleService, IProductModuleService, Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { MediaRef } from "@nocido/types";
import { CATEGORY_BANNERS_MODULE } from "../modules/category-banners";
import type CategoryBannersModuleService from "../modules/category-banners/service";
import { HERO_SLIDES_MODULE } from "../modules/hero-slides";
import type HeroSlidesModuleService from "../modules/hero-slides/service";
import { PAGES_MODULE } from "../modules/pages";
import type PagesModuleService from "../modules/pages/service";
import { STORE_SETTINGS_MODULE } from "../modules/store-settings";
import type StoreSettingsModuleService from "../modules/store-settings/service";

/** Images an item had before a write and has after it (null: none). */
export type MediaSlots = readonly (MediaRef | null | undefined)[];

/** Files dropped by a write: in `before`, absent from `after` (by File Module id). */
export function droppedMedia(before: MediaSlots, after: MediaSlots): MediaRef[] {
  const kept = new Set(after.flatMap((media) => (media ? [media.id] : [])));
  const seen = new Set<string>();
  return before.flatMap((media) => {
    if (!media || kept.has(media.id) || seen.has(media.id)) return [];
    seen.add(media.id);
    return [media];
  });
}

/** True when `media` (id or URL) appears anywhere in the serialized documents. */
export function mentions(documents: readonly unknown[], media: MediaRef): boolean {
  return documents.some((document) => {
    const text = typeof document === "string" ? document : JSON.stringify(document);
    return text.includes(media.url) || text.includes(`"${media.id}"`);
  });
}

interface Resolver {
  resolve<T>(key: string): T;
}

/** Every place an uploaded file can be used: slides, banners, settings, CMS pages, products. */
async function referencingDocuments(scope: Resolver): Promise<unknown[]> {
  const products = scope.resolve<IProductModuleService>(Modules.PRODUCT);
  const [slides, banners, settings, pages, productRows] = await Promise.all([
    scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE).listSlides(),
    scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE).listBanners(),
    scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE).getSettings(),
    scope.resolve<PagesModuleService>(PAGES_MODULE).listPages(),
    products.listProducts({}, { select: ["id", "thumbnail"], relations: ["images"], take: null }),
  ]);
  return [slides, banners, settings, pages, productRows];
}

/**
 * After a slide or banner write (or deletion), deletes the files it no
 * longer uses from the File Module (static/ on the VPS), unless they are
 * still referenced elsewhere. Call it once the write is saved. Never
 * throws: a file left behind is only logged.
 */
export async function releaseMedia(
  scope: Resolver,
  before: MediaSlots,
  after: MediaSlots,
): Promise<string[]> {
  const candidates = droppedMedia(before, after);
  if (candidates.length === 0) return [];
  const logger = scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER);
  try {
    const documents = await referencingDocuments(scope);
    const orphans = candidates.filter((media) => !mentions(documents, media));
    if (orphans.length === 0) return [];
    const ids = orphans.map((media) => media.id);
    await scope.resolve<IFileModuleService>(Modules.FILE).deleteFiles(ids);
    logger.info(`[media] deleted unused files: ${ids.join(", ")}`);
    return ids;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[media] unused files kept: ${message}`);
    return [];
  }
}

/**
 * Client catalog seed: categories, collections, products with variants,
 * placeholder images, sale prices, ar/fr/en translations, default
 * StoreSettings. Data lives in data/seed/*.json (the kit code stays generic).
 * Idempotent: existing handles are kept, translations are upserted.
 *
 *   pnpm --filter @nocido/backend catalog:seed
 *   SEED_SETTINGS=force pnpm --filter @nocido/backend catalog:seed   # re-apply settings
 *   SEED_HOME=force pnpm --filter @nocido/backend catalog:seed       # recreate slides and banners
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  ExecArgs,
  IProductModuleService,
  ITranslationModuleService,
  Logger,
} from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  PriceListStatus,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  categoryBannerInputSchema,
  HOME_IMAGE_SIZES,
  heroSlideInputSchema,
  LOCALES,
  type Locale,
  type MediaRef,
  type LocalizedString,
  localizedStringSchema,
  pageInputSchema,
  storeSettingsUpdateSchema,
  toMedusaLocale,
} from "@nocido/types";
import { z } from "zod";
import { CATEGORY_BANNERS_MODULE } from "../modules/category-banners";
import type CategoryBannersModuleService from "../modules/category-banners/service";
import { HERO_SLIDES_MODULE } from "../modules/hero-slides";
import type HeroSlidesModuleService from "../modules/hero-slides/service";
import { PAGES_MODULE } from "../modules/pages";
import type PagesModuleService from "../modules/pages/service";
import { STORE_SETTINGS_MODULE } from "../modules/store-settings";
import type StoreSettingsModuleService from "../modules/store-settings/service";
import { updateStoreSettingsWorkflow } from "../workflows/update-store-settings";
import {
  type PlaceholderScene,
  placeholderSceneSchema,
  placeholderSceneSvg,
  placeholderShapeSchema,
  placeholderSvg,
} from "./lib/placeholder";

const localized = localizedStringSchema;

const catalogSchema = z.object({
  categories: z.array(
    z.object({
      handle: z.string(),
      rank: z.number().int(),
      name: localized,
      description: localized,
    }),
  ),
  collections: z.array(z.object({ handle: z.string(), title: localized })),
  optionTitle: localized,
  products: z.array(
    z.object({
      handle: z.string(),
      category: z.string(),
      collection: z.string().nullable(),
      featured: z.boolean(),
      rating: z.number().min(0).max(5),
      reviewsCount: z.number().int().min(0),
      placeholder: placeholderShapeSchema,
      title: localized,
      subtitle: localized,
      description: localized,
      variants: z
        .array(
          z.object({
            value: z.string(),
            sku: z.string(),
            weight: z.number().int().positive(),
            price: z.number().positive(),
            compareAt: z.number().positive().nullable(),
          }),
        )
        .min(1),
    }),
  ),
});
type Catalog = z.infer<typeof catalogSchema>;

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data", "seed", file), "utf8"));
}

interface SeedContext {
  container: ExecArgs["container"];
  logger: Logger;
  baseLocale: Locale;
  /** Medusa locale code per translated kit locale (everything but the base). */
  translationLocales: { locale: Locale; code: string }[];
}

/** Base fields are written in the store default locale, the others become translations. */
function base(value: LocalizedString, ctx: SeedContext): string {
  return value[ctx.baseLocale] ?? Object.values(value)[0] ?? "";
}

async function upsertTranslations(
  ctx: SeedContext,
  reference: string,
  referenceId: string,
  fields: Record<string, LocalizedString>,
): Promise<void> {
  const service = ctx.container.resolve<ITranslationModuleService>(Modules.TRANSLATION);
  for (const { locale, code } of ctx.translationLocales) {
    const translations = Object.fromEntries(
      Object.entries(fields)
        .map(([field, value]) => [field, value[locale]])
        .filter((entry): entry is [string, string] => Boolean(entry[1])),
    );
    if (Object.keys(translations).length === 0) continue;
    const [existing] = await service.listTranslations({
      reference_id: referenceId,
      locale_code: code,
    });
    if (existing) await service.updateTranslations({ id: existing.id, translations });
    else
      await service.createTranslations({
        reference,
        reference_id: referenceId,
        locale_code: code,
        translations,
      });
  }
}

async function seedCategories(ctx: SeedContext, catalog: Catalog): Promise<Map<string, string>> {
  const productService = ctx.container.resolve<IProductModuleService>(Modules.PRODUCT);
  const existing = await productService.listProductCategories(
    { handle: catalog.categories.map((category) => category.handle) },
    { take: null },
  );
  const ids = new Map(existing.map((category) => [category.handle, category.id]));
  const missing = catalog.categories.filter((category) => !ids.has(category.handle));
  if (missing.length > 0) {
    const { result } = await createProductCategoriesWorkflow(ctx.container).run({
      input: {
        product_categories: missing.map((category) => ({
          handle: category.handle,
          name: base(category.name, ctx),
          description: base(category.description, ctx),
          rank: category.rank,
          is_active: true,
        })),
      },
    });
    for (const category of result) ids.set(category.handle, category.id);
  }
  for (const category of catalog.categories) {
    const id = ids.get(category.handle);
    if (id) {
      await upsertTranslations(ctx, "product_category", id, {
        name: category.name,
        description: category.description,
      });
    }
  }
  return ids;
}

async function seedCollections(ctx: SeedContext, catalog: Catalog): Promise<Map<string, string>> {
  const productService = ctx.container.resolve<IProductModuleService>(Modules.PRODUCT);
  const existing = await productService.listProductCollections(
    { handle: catalog.collections.map((collection) => collection.handle) },
    { take: null },
  );
  const ids = new Map(existing.map((collection) => [collection.handle, collection.id]));
  const missing = catalog.collections.filter((collection) => !ids.has(collection.handle));
  if (missing.length > 0) {
    const { result } = await createCollectionsWorkflow(ctx.container).run({
      input: {
        collections: missing.map((collection) => ({
          handle: collection.handle,
          title: base(collection.title, ctx),
        })),
      },
    });
    for (const collection of result) ids.set(collection.handle, collection.id);
  }
  for (const collection of catalog.collections) {
    const id = ids.get(collection.handle);
    if (id) await upsertTranslations(ctx, "product_collection", id, { title: collection.title });
  }
  return ids;
}

async function uploadPlaceholder(
  ctx: SeedContext,
  handle: string,
  product: Catalog["products"][number],
) {
  const svg = placeholderSvg(product.placeholder);
  const { result } = await uploadFilesWorkflow(ctx.container).run({
    input: {
      files: [
        {
          filename: `${handle}.svg`,
          mimeType: "image/svg+xml",
          content: Buffer.from(svg, "utf8").toString("base64"),
          access: "public",
        },
      ],
    },
  });
  const url = result[0]?.url;
  if (!url) throw new Error(`Placeholder upload failed for ${handle}`);
  return url;
}

async function seedProducts(
  ctx: SeedContext,
  catalog: Catalog,
  categories: Map<string, string>,
  collections: Map<string, string>,
): Promise<void> {
  const productService = ctx.container.resolve<IProductModuleService>(Modules.PRODUCT);
  const salesChannelService = ctx.container.resolve(Modules.SALES_CHANNEL);
  const fulfillmentService = ctx.container.resolve(Modules.FULFILLMENT);
  const storeService = ctx.container.resolve(Modules.STORE);

  const [store] = await storeService.listStores({}, { take: 1 });
  const salesChannelId =
    store?.default_sales_channel_id ??
    (await salesChannelService.listSalesChannels({}, { take: 1 }))[0]?.id;
  const [profile] = await fulfillmentService.listShippingProfiles({ type: "default" }, { take: 1 });
  if (!salesChannelId || !profile)
    throw new Error("Run store:setup first (sales channel, shipping profile)");

  const optionTitle = base(catalog.optionTitle, ctx);
  const existing = await productService.listProducts(
    { handle: catalog.products.map((product) => product.handle) },
    { take: null },
  );
  const existingHandles = new Set(existing.map((product) => product.handle));

  const toCreate = [];
  for (const product of catalog.products) {
    if (existingHandles.has(product.handle)) continue;
    const imageUrl = await uploadPlaceholder(ctx, product.handle, product);
    const categoryId = categories.get(product.category);
    const collectionId = product.collection ? collections.get(product.collection) : undefined;
    toCreate.push({
      title: base(product.title, ctx),
      subtitle: base(product.subtitle, ctx),
      description: base(product.description, ctx),
      handle: product.handle,
      status: ProductStatus.PUBLISHED,
      thumbnail: imageUrl,
      images: [{ url: imageUrl }],
      category_ids: categoryId ? [categoryId] : [],
      collection_id: collectionId,
      shipping_profile_id: profile.id,
      sales_channels: [{ id: salesChannelId }],
      weight: product.variants[0]?.weight,
      metadata: {
        featured: product.featured,
        rating: product.rating,
        reviews_count: product.reviewsCount,
      },
      options: [{ title: optionTitle, values: product.variants.map((variant) => variant.value) }],
      variants: product.variants.map((variant) => ({
        title: variant.value,
        sku: variant.sku,
        weight: variant.weight,
        manage_inventory: false,
        options: { [optionTitle]: variant.value },
        prices: [{ currency_code: "mad", amount: variant.compareAt ?? variant.price }],
      })),
    });
  }

  if (toCreate.length > 0) {
    const { result } = await createProductsWorkflow(ctx.container).run({
      input: { products: toCreate },
    });
    ctx.logger.info(`Catalog: ${result.length} products created`);

    // Sale prices: regular price on the variant, sale price in a "sale" price list.
    const salePrices = result.flatMap((created) => {
      const source = catalog.products.find((product) => product.handle === created.handle);
      return (created.variants ?? []).flatMap((variant) => {
        const seed = source?.variants.find((candidate) => candidate.sku === variant.sku);
        return seed?.compareAt
          ? [{ variant_id: variant.id, amount: seed.price, currency_code: "mad" }]
          : [];
      });
    });
    if (salePrices.length > 0) {
      await createPriceListsWorkflow(ctx.container).run({
        input: {
          price_lists_data: [
            {
              title: "Promotions",
              description: "catalog:seed",
              status: PriceListStatus.ACTIVE,
              prices: salePrices,
            },
          ],
        },
      });
    }
  }

  // Translations, for new and existing products alike.
  const products = await productService.listProducts(
    { handle: catalog.products.map((product) => product.handle) },
    { relations: ["options"], take: null },
  );
  for (const product of products) {
    const source = catalog.products.find((candidate) => candidate.handle === product.handle);
    if (!source) continue;
    await upsertTranslations(ctx, "product", product.id, {
      title: source.title,
      subtitle: source.subtitle,
      description: source.description,
    });
    for (const option of product.options) {
      await upsertTranslations(ctx, "product_option", option.id, { title: catalog.optionTitle });
    }
  }
}

const pagesSeedSchema = z.object({
  pages: z.array(
    pageInputSchema.pick({ handle: true, title: true, content: true, seo: true, footerRank: true }),
  ),
});

/** CMS pages, created once by handle and published in the footer. */
async function seedPages(ctx: SeedContext): Promise<void> {
  const service = ctx.container.resolve<PagesModuleService>(PAGES_MODULE);
  const { pages } = pagesSeedSchema.parse(readJson("pages.json"));
  const existing = new Set((await service.listPages()).map((page) => page.handle));
  let created = 0;
  for (const page of pages) {
    if (existing.has(page.handle)) continue;
    await service.savePage({ ...page, status: "published", showInFooter: true });
    created++;
  }
  ctx.logger.info(`Pages: ${created} created`);
}

const homeSeedSchema = z.object({
  slides: z.array(
    heroSlideInputSchema
      .pick({
        title: true,
        subtitle: true,
        ctaLabel: true,
        link: true,
        textAlign: true,
        overlay: true,
        durationSeconds: true,
      })
      .extend({ key: z.string(), scene: placeholderSceneSchema }),
  ),
  banners: z.array(
    categoryBannerInputSchema
      .pick({ title: true, tagline: true, link: true })
      .extend({ key: z.string(), scene: placeholderSceneSchema }),
  ),
});

async function uploadScene(
  ctx: SeedContext,
  filename: string,
  scene: PlaceholderScene,
  size: { width: number; height: number },
): Promise<MediaRef> {
  const svg = placeholderSceneSvg(scene, size);
  const { result } = await uploadFilesWorkflow(ctx.container).run({
    input: {
      files: [
        {
          filename,
          mimeType: "image/svg+xml",
          content: Buffer.from(svg, "utf8").toString("base64"),
          access: "public",
        },
      ],
    },
  });
  const file = result[0];
  if (!file) throw new Error(`Placeholder upload failed for ${filename}`);
  return { id: file.id, url: file.url, mimeType: "image/svg+xml", ...size };
}

/**
 * Hero slides and category banners, created only while each list is empty.
 * SEED_HOME=force deletes the existing ones first (uploaded files are kept).
 */
async function seedHome(ctx: SeedContext): Promise<void> {
  const { slides, banners } = homeSeedSchema.parse(readJson("home.json"));
  const force = process.env.SEED_HOME === "force";

  const slideService = ctx.container.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const bannerService =
    ctx.container.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  if (force) {
    await slideService.deleteHeroSlides((await slideService.listSlides()).map(({ id }) => id));
    await bannerService.deleteCategoryBanners(
      (await bannerService.listBanners()).map(({ id }) => id),
    );
  }

  if ((await slideService.listSlides()).length === 0) {
    for (const [rank, { key, scene, ...slide }] of slides.entries()) {
      await slideService.saveSlide({
        ...slide,
        active: true,
        rank,
        imageDesktop: await uploadScene(
          ctx,
          `hero-${key}-desktop.svg`,
          scene,
          HOME_IMAGE_SIZES.slideDesktop,
        ),
        imageMobile: await uploadScene(
          ctx,
          `hero-${key}-mobile.svg`,
          scene,
          HOME_IMAGE_SIZES.slideMobile,
        ),
      });
    }
    ctx.logger.info(`Home: ${slides.length} hero slides created`);
  } else {
    ctx.logger.info("Home: hero slides already exist, kept");
  }

  if ((await bannerService.listBanners()).length === 0) {
    for (const [rank, { key, scene, ...banner }] of banners.entries()) {
      await bannerService.saveBanner({
        ...banner,
        active: true,
        rank,
        ctaLabel: {},
        imageDesktop: await uploadScene(
          ctx,
          `banner-${key}-desktop.svg`,
          scene,
          HOME_IMAGE_SIZES.bannerDesktop,
        ),
        imageMobile: await uploadScene(
          ctx,
          `banner-${key}-mobile.svg`,
          scene,
          HOME_IMAGE_SIZES.bannerMobile,
        ),
      });
    }
    ctx.logger.info(`Home: ${banners.length} category banners created`);
  } else {
    ctx.logger.info("Home: category banners already exist, kept");
  }
}

async function seedSettings(ctx: SeedContext): Promise<void> {
  const service = ctx.container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  const force = process.env.SEED_SETTINGS === "force";
  if (!force && (await service.getSnapshot())) {
    ctx.logger.info("Settings already saved: kept (SEED_SETTINGS=force to re-apply)");
    return;
  }
  const raw = readJson("store-settings.json") as Record<string, unknown>;
  delete raw.$comment;
  const patch = storeSettingsUpdateSchema.parse(raw);
  await updateStoreSettingsWorkflow(ctx.container).run({ input: { patch } });
  ctx.logger.info("Settings: Essadrati defaults applied");
}

export default async function seedCatalog({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const settingsService = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  const ctxBase = { container, logger };

  await seedSettings({ ...ctxBase, baseLocale: "ar", translationLocales: [] });
  const settings = await settingsService.getSettings();
  const baseLocale = settings.localization.defaultLocale;
  const ctx: SeedContext = {
    ...ctxBase,
    baseLocale,
    translationLocales: LOCALES.filter((locale) => locale !== baseLocale).map((locale) => ({
      locale,
      code: toMedusaLocale(locale, settings.contact.country),
    })),
  };

  const catalog = catalogSchema.parse(readJson("catalog.json"));
  const categories = await seedCategories(ctx, catalog);
  const collections = await seedCollections(ctx, catalog);
  await seedProducts(ctx, catalog, categories, collections);
  await seedPages(ctx);
  await seedHome(ctx);
  logger.info("Catalog seed done");
}

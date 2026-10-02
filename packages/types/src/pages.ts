import { z } from "zod";
import { localizedStringSchema } from "./locale";

/** First path segments taken by storefront routes: a CMS page cannot use them. */
export const RESERVED_PAGE_HANDLES = ["c", "p", "products", "checkout", "order", "ui-kit"] as const;

/** URL segment of a CMS page: /ar/our-story. */
export const pageHandleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "page.handle.invalid")
  .max(80, "page.handle.invalid")
  .refine(
    (handle) => !(RESERVED_PAGE_HANDLES as readonly string[]).includes(handle),
    "page.handle.reserved",
  );

export const PAGE_STATUSES = ["draft", "published"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];

/** Rich content is Markdown, one document per locale (no raw HTML is rendered). */
export const localizedMarkdownSchema = z.partialRecord(
  z.enum(["ar", "fr", "en"]),
  z.string().max(100_000),
);

export const pageInputSchema = z.object({
  handle: pageHandleSchema,
  title: localizedStringSchema,
  content: localizedMarkdownSchema,
  seo: z.object({
    metaTitle: localizedStringSchema,
    metaDescription: localizedStringSchema,
  }),
  status: z.enum(PAGE_STATUSES),
  showInFooter: z.boolean(),
  footerRank: z.number().int().min(0).max(1000),
});
export type PageInput = z.infer<typeof pageInputSchema>;

/** A page as returned by the APIs. */
export const pageSchema = pageInputSchema.extend({
  id: z.string(),
  publishedAt: z.iso.datetime({ offset: true }).nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type Page = z.infer<typeof pageSchema>;

/** Footer and sitemap entry: no content. */
export const pageSummarySchema = pageSchema.pick({
  id: true,
  handle: true,
  title: true,
  showInFooter: true,
  footerRank: true,
  updatedAt: true,
});
export type PageSummary = z.infer<typeof pageSummarySchema>;

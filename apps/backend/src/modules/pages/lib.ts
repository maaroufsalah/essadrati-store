import {
  localizedMarkdownSchema,
  localizedStringSchema,
  type Page,
  type PageInput,
} from "@nocido/types";

/** Row as stored by the cms_page model. */
export interface CmsPageRecord {
  id: string;
  handle: string;
  title: unknown;
  content: unknown;
  seo: unknown;
  status: "draft" | "published";
  show_in_footer: boolean;
  footer_rank: number;
  published_at: Date | string | null;
  updated_at: Date | string;
}

const iso = (value: Date | string): string => new Date(value).toISOString();

function seoOf(value: unknown): Page["seo"] {
  const record = (value ?? {}) as { metaTitle?: unknown; metaDescription?: unknown };
  return {
    metaTitle: localizedStringSchema.catch({}).parse(record.metaTitle),
    metaDescription: localizedStringSchema.catch({}).parse(record.metaDescription),
  };
}

/** Record -> API shape. Invalid JSON degrades to empty values, never throws. */
export function toPage(record: CmsPageRecord): Page {
  return {
    id: record.id,
    handle: record.handle,
    title: localizedStringSchema.catch({}).parse(record.title),
    content: localizedMarkdownSchema.catch({}).parse(record.content),
    seo: seoOf(record.seo),
    status: record.status,
    showInFooter: record.show_in_footer,
    footerRank: record.footer_rank,
    publishedAt: record.published_at ? iso(record.published_at) : null,
    updatedAt: iso(record.updated_at),
  };
}

/**
 * API input -> model data. published_at is set the first time a page is
 * published and kept afterwards.
 */
export function toRecordData(input: PageInput, current: CmsPageRecord | null, now = new Date()) {
  const publishedAt =
    input.status === "published"
      ? current?.published_at
        ? new Date(current.published_at)
        : now
      : null;
  return {
    handle: input.handle,
    title: input.title,
    content: input.content,
    seo: input.seo,
    status: input.status,
    show_in_footer: input.showInFooter,
    footer_rank: input.footerRank,
    published_at: publishedAt,
  };
}

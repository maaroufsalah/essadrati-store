import { HOME_LINK_TYPES, type Locale, toMedusaLocale } from "@nocido/types";

/** Kinds of link the admin can search (URLs are typed, not searched). */
export const SEARCHABLE_LINKS = HOME_LINK_TYPES.filter(
  (type): type is "category" | "product" => type !== "url",
);
export type SearchableLink = (typeof SEARCHABLE_LINKS)[number];

/** Catalog entity behind each link type: translation reference and its name field. */
export const LINK_SOURCES = {
  category: { reference: "product_category", field: "name" },
  product: { reference: "product", field: "title" },
} as const satisfies Record<SearchableLink, { reference: string; field: string }>;

export interface LinkTarget {
  handle: string;
  /** Name in the admin language when translated, else the base name. */
  label: string;
}

/** ILIKE pattern matching `query` anywhere, with % and _ taken literally. */
export function containsPattern(query: string): string {
  return `%${query.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Medusa locale whose translations label the results ("fr-MA"). */
export function labelLocale(locale: Locale, country: string): string {
  return toMedusaLocale(locale, country);
}

/** Translated name for one row, falling back to its base name. */
export function targetLabel(
  base: string,
  translations: Record<string, unknown> | null | undefined,
  field: string,
): string {
  const translated = translations?.[field];
  return typeof translated === "string" && translated.trim() ? translated : base;
}

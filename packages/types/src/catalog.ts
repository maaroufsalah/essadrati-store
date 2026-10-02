import { z } from "zod";
import {
  type CatalogFacet,
  DEFAULT_CATALOG_FACETS,
  FACET_KINDS,
  RESERVED_CATALOG_PARAMS,
} from "./catalog-core";
import { localizedStringSchema } from "./locale";

export * from "./catalog-core";

/** URL-safe facet id, not one of the reserved parameters. */
export const facetIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9-]{0,29}$/, "catalog.facet.id")
  .refine(
    (id) => !(RESERVED_CATALOG_PARAMS as readonly string[]).includes(id),
    "catalog.facet.reserved",
  );

export const catalogFacetSchema = z
  .object({
    id: facetIdSchema,
    kind: z.enum(FACET_KINDS),
    option: z.string().trim().min(1).max(120).optional(),
    enabled: z.boolean(),
    label: localizedStringSchema,
  })
  .refine((facet) => facet.kind !== "option" || Boolean(facet.option), {
    message: "catalog.facet.option",
    path: ["option"],
  });

// The zod-free CatalogFacet (catalog-core) must stay the schema output type.
type SameType<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameFacet: SameType<z.infer<typeof catalogFacetSchema>, CatalogFacet> = true;
void sameFacet;

/** StoreSettings.catalog: which filters the catalog pages show, in which order. */
export const catalogSettingsSchema = z.object({
  facets: z
    .array(catalogFacetSchema)
    .max(20)
    .refine(
      (facets) => new Set(facets.map((facet) => facet.id)).size === facets.length,
      "catalog.facet.duplicate",
    )
    .refine(
      (facets) =>
        facets.filter((facet) => facet.kind !== "option").length ===
        new Set(facets.filter((facet) => facet.kind !== "option").map((facet) => facet.kind)).size,
      "catalog.facet.duplicateKind",
    ),
});
export type CatalogSettings = z.infer<typeof catalogSettingsSchema>;

export const DEFAULT_CATALOG_SETTINGS: CatalogSettings = {
  facets: DEFAULT_CATALOG_FACETS.map((facet) => ({ ...facet, label: { ...facet.label } })),
};

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { IRegionModuleService } from "@medusajs/framework/types";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import { getCatalogIndex } from "../../../../lib/catalog-index";
import { parseCatalogQuery } from "@nocido/types";
import { searchCatalog } from "../../../../lib/catalog-search";
import { STORE_SETTINGS_MODULE } from "../../../../modules/store-settings";
import type StoreSettingsModuleService from "../../../../modules/store-settings/service";

type Raw = Record<string, string | string[] | undefined>;

const one = (value: unknown) => (typeof value === "string" ? value : undefined);

/**
 * GET /store/catalog/search?region_id=…[&scope_category=handle][&<facet id>=v1,v2]
 *   [&min=&max=][&sort=relevance|price_asc|price_desc|newest|bestsellers][&page=]
 * Faceted search of the published catalog (admin › Catalogue picks the
 * facets): one page of product ids, the total, the price range and the
 * count of every facet value. The storefront then loads those products
 * through /store/products (translated, priced).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const raw = req.query as Raw;
  const regionId = one(raw.region_id);
  if (!regionId) throw new MedusaError(MedusaError.Types.INVALID_DATA, "catalog.region.missing");
  const region = await req.scope
    .resolve<IRegionModuleService>(Modules.REGION)
    .retrieveRegion(regionId, { select: ["id", "currency_code"] });

  const settings = await req.scope
    .resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
    .getSettings();
  const facets = settings.catalog.facets.filter((facet) => facet.enabled);

  const keyContext = (
    req as MedusaRequest & {
      publishable_key_context?: { sales_channel_ids?: string[] };
    }
  ).publishable_key_context;
  const entries = await getCatalogIndex(req.scope, {
    regionId: region.id,
    currencyCode: region.currency_code,
    salesChannelId: keyContext?.sales_channel_ids?.[0] ?? null,
  });

  const result = searchCatalog(entries, {
    query: parseCatalogQuery(raw, facets),
    facets,
    scope: { category: one(raw.scope_category) },
  });
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json(result);
}

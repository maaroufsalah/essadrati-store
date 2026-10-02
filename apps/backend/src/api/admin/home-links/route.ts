import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  FilterableProductCategoryProps,
  IProductModuleService,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { isLocale } from "@nocido/types";
import type { Knex } from "@medusajs/framework/mikro-orm/knex";
import {
  containsPattern,
  LINK_SOURCES,
  labelLocale,
  type LinkTarget,
  SEARCHABLE_LINKS,
  type SearchableLink,
  targetLabel,
} from "../../../lib/link-search";
import { sendInvalid } from "../../../lib/validation";
import { STORE_SETTINGS_MODULE } from "../../../modules/store-settings";
import type StoreSettingsModuleService from "../../../modules/store-settings/service";

const LIMIT = 10;

interface Row {
  id: string;
  handle: string;
  name: string;
}

function one(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * GET /admin/home-links?type=category|product&q=…&locale=fr
 * Link picker of the home slides and banners: up to 10 categories or
 * products whose handle, base name or translated name contains `q`, or the
 * one whose handle is `handle` (to label a saved link). Labels are in the
 * admin language when translated.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const type = one(req.query.type) as SearchableLink;
  if (!SEARCHABLE_LINKS.includes(type)) {
    return sendInvalid(res, [{ path: "type", code: "invalid" }]);
  }
  const query = one(req.query.q).slice(0, 100);
  const handle = one(req.query.handle);
  const requested = one(req.query.locale);
  const source = LINK_SOURCES[type];

  const knex = req.scope.resolve<Knex>(ContainerRegistrationKeys.PG_CONNECTION);
  const products = req.scope.resolve<IProductModuleService>(Modules.PRODUCT);

  let translatedIds: string[] = [];
  if (query.trim() && !handle) {
    const rows: unknown[] = await knex("translation")
      .distinct("reference_id")
      .where({ reference: source.reference })
      .whereNull("deleted_at")
      .whereRaw("translations->>? ilike ?", [source.field, containsPattern(query)])
      .limit(50);
    translatedIds = (rows as { reference_id: string }[]).map((row) => row.reference_id);
  }

  // handle, base name or translated name (rows found above) contains the query.
  const like = { $ilike: containsPattern(query) };
  const byIds = translatedIds.length > 0 ? [{ id: translatedIds }] : [];
  const config = { take: LIMIT };
  const found: unknown[] =
    type === "product"
      ? await products.listProducts(
          handle
            ? { handle }
            : query.trim()
              ? { $or: [{ handle: like }, { title: like }, ...byIds] }
              : {},
          { ...config, select: ["id", "handle", "title"], order: { title: "ASC" } },
        )
      : await products.listProductCategories(
          // The category filter type omits $or/$ilike, which the service supports.
          (handle
            ? { handle }
            : query.trim()
              ? { $or: [{ handle: like }, { name: like }, ...byIds] }
              : {}) as FilterableProductCategoryProps,
          { ...config, select: ["id", "handle", "name"], order: { rank: "ASC" } },
        );
  const rows = (found as { id: string; handle: string; title?: string; name?: string }[]).map(
    (row): Row => ({ id: row.id, handle: row.handle, name: row.title ?? row.name ?? row.handle }),
  );

  // Labels in the admin language, when the catalog has translations for it.
  const settings = await req.scope
    .resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
    .getSettings();
  const locale = isLocale(requested) ? requested : settings.localization.defaultLocale;
  const translationRows: unknown[] =
    rows.length > 0
      ? await knex("translation")
          .select("reference_id", "translations")
          .where({
            reference: source.reference,
            locale_code: labelLocale(locale, settings.contact.country),
          })
          .whereIn(
            "reference_id",
            rows.map((row) => row.id),
          )
          .whereNull("deleted_at")
      : [];
  const translations = translationRows as {
    reference_id: string;
    translations: Record<string, unknown>;
  }[];
  const byId = new Map(translations.map((row) => [row.reference_id, row.translations]));

  const targets: LinkTarget[] = rows.map((row) => ({
    handle: row.handle,
    label: targetLabel(row.name, byId.get(row.id), source.field),
  }));
  res.json({ targets });
}

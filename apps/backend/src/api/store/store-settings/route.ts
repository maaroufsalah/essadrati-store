import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { STORE_SETTINGS_MODULE } from "../../../modules/store-settings";
import type StoreSettingsModuleService from "../../../modules/store-settings/service";

/**
 * GET /store/store-settings: public settings (no SMTP, no bank details).
 * Requires the publishable API key like every /store route.
 * The storefront caches it with the `store-settings` tag; the short HTTP
 * cache only protects the backend from bursts of direct calls.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json({ settings: await service.getPublicSettings() });
}

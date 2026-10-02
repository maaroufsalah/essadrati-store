import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { generateTokensOrFallback } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import { STORE_SETTINGS_MODULE } from "../../modules/store-settings";
import type StoreSettingsModuleService from "../../modules/store-settings/service";

/**
 * GET /branding: public subset used to brand the Medusa admin (login page
 * included, before any session exists): logos, primary colors, button radius.
 * Everything here is already public on the storefront.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  const settings = await service.getPublicSettings();
  const tokens = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG);

  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({
    branding: {
      logoLight: settings.identity.logoLight?.url ?? null,
      logoDark: settings.identity.logoDark?.url ?? null,
      light: { primary: tokens.colors.light.primary, primaryFg: tokens.colors.light.primaryFg },
      dark: { primary: tokens.colors.dark.primary, primaryFg: tokens.colors.dark.primaryFg },
      buttonRadius: tokens.native.radius.button,
    },
  });
}

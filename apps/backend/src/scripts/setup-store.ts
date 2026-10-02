/**
 * Initial store setup. Idempotent: safe to run again after a partial run.
 *
 *   pnpm --filter @nocido/backend store:setup
 *
 * - Store currency (SETUP_CURRENCY, default currency only)
 * - Store locales: one per kit locale, derived from SETUP_COUNTRY (ar-MA...)
 * - Region for SETUP_COUNTRY with the COD and system payment providers
 * - Tax region for SETUP_COUNTRY, prices tax inclusive in SETUP_CURRENCY
 * - COD shipping: stock location, fulfillment set, calculated shipping option
 * - COD delivery zones and cities (data/moroccan-cities.json)
 * - Publishable API key linked to the default sales channel
 *
 * No client data here: names are computed with Intl.DisplayNames, and the
 * storefront content comes from StoreSettings.
 */
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { LOCALES, toMedusaLocale } from "@nocido/types";
import { setupCodShipping } from "./lib/cod-shipping";
import { seedCities } from "./seed-cities";

/** Language used for names only the back office sees (region, locales). */
const ADMIN_LANGUAGE = "fr";

function setupEnv(name: string, fallback: string, pattern: RegExp): string {
  const value = (process.env[name] ?? fallback).trim().toLowerCase();
  if (!pattern.test(value)) throw new Error(`${name} is invalid: "${value}"`);
  return value;
}

export default async function setupStore({ container }: ExecArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const apiKeyService = container.resolve(Modules.API_KEY);
  const storeService = container.resolve(Modules.STORE);
  const regionService = container.resolve(Modules.REGION);
  const taxService = container.resolve(Modules.TAX);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const translationService = container.resolve(Modules.TRANSLATION);

  const country = setupEnv("SETUP_COUNTRY", "ma", /^[a-z]{2}$/);
  const currency = setupEnv("SETUP_CURRENCY", "mad", /^[a-z]{3}$/);
  const countryName =
    new Intl.DisplayNames([ADMIN_LANGUAGE], { type: "region" }).of(country.toUpperCase()) ??
    country.toUpperCase();

  // Locales known to the Translation Module.
  const localeCodes = LOCALES.map((locale) => toMedusaLocale(locale, country));
  const existingLocales = await translationService.listLocales({ code: localeCodes });
  const languageNames = new Intl.DisplayNames([ADMIN_LANGUAGE], { type: "language" });
  for (const code of localeCodes) {
    if (existingLocales.some((locale) => locale.code === code)) continue;
    await translationService.createLocales({ code, name: languageNames.of(code) ?? code });
    logger.info(`Locale ${code} created`);
  }

  // Default sales channel.
  const [store] = await storeService.listStores({}, { relations: ["supported_locales"] });
  if (!store) throw new Error("No store found: run `medusa db:migrate` first");

  let salesChannelId: string | null | undefined = store.default_sales_channel_id;
  if (!salesChannelId) {
    const [existing] = await salesChannelService.listSalesChannels({}, { take: 1 });
    if (existing) {
      salesChannelId = existing.id;
    } else {
      const { result } = await createSalesChannelsWorkflow(container).run({
        input: { salesChannelsData: [{ name: countryName }] },
      });
      salesChannelId = result[0]?.id ?? null;
    }
  }
  if (!salesChannelId) throw new Error("Could not resolve a sales channel");

  // Region.
  let [region] = await regionService.listRegions({ currency_code: currency }, { take: 1 });
  if (!region) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: countryName,
            currency_code: currency,
            countries: [country],
            payment_providers: ["pp_system_default"],
            automatic_taxes: true,
          },
        ],
      },
    });
    region = result[0];
    logger.info(`Region ${countryName} (${currency.toUpperCase()}) created`);
  }
  if (!region) throw new Error("Could not create the region");

  // Store: currency, locales, defaults.
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: currency, is_default: true }],
        supported_locales: localeCodes.map((locale_code) => ({ locale_code })),
        default_sales_channel_id: salesChannelId,
        default_region_id: region.id,
      },
    },
  });
  logger.info(`Store updated: ${currency.toUpperCase()}, locales ${localeCodes.join(", ")}`);

  // Tax region.
  const taxRegions = await taxService.listTaxRegions({ country_code: country });
  if (taxRegions.length === 0) {
    await createTaxRegionsWorkflow(container).run({
      input: [{ country_code: country, provider_id: "tp_system" }],
    });
    logger.info(`Tax region ${country.toUpperCase()} created`);
  }

  // Moroccan prices are displayed tax included (TTC).
  const pricingService = container.resolve(Modules.PRICING);
  const preferences = await pricingService.listPricePreferences({
    attribute: "currency_code",
    value: [currency],
  });
  if (preferences.length === 0) {
    await pricingService.createPricePreferences({
      attribute: "currency_code",
      value: currency,
      is_tax_inclusive: true,
    });
  }

  await setupCodShipping(container, {
    country,
    countryName,
    storeId: store.id,
    regionId: region.id,
    salesChannelId,
  });
  await seedCities(container);

  // Publishable API key for the storefront and the mobile app.
  let [apiKey] = await apiKeyService.listApiKeys({ type: "publishable" }, { take: 1 });
  if (!apiKey) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }] },
    });
    apiKey = result[0];
  }
  if (!apiKey) throw new Error("Could not create the publishable API key");

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannelId] },
  });

  logger.info(`Publishable key: ${apiKey.token} (NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)`);
}

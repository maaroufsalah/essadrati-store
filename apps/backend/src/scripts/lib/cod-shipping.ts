import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { COD_PAYMENT_PROVIDER_ID } from "../../modules/cod-payment";
import { MANUAL_COD_PROVIDER_ID } from "../../modules/manual-cod";

/** Code of the shipping option type used by COD orders. */
export const COD_SHIPPING_TYPE_CODE = "cod";

interface CodShippingInput {
  country: string;
  countryName: string;
  storeId: string;
  regionId: string;
  salesChannelId: string;
}

/**
 * Infrastructure for cash on delivery, idempotent:
 * COD payment provider on the region, a stock location linked to the sales
 * channel and to the manual-cod fulfillment provider, a shipping fulfillment
 * set covering the country, and one calculated shipping option whose price
 * is set by the place-cod-order workflow.
 */
export async function setupCodShipping(
  container: ExecArgs["container"],
  input: CodShippingInput,
): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentService = container.resolve(Modules.FULFILLMENT);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  // Region payment providers: COD plus the system default.
  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: input.regionId },
      update: { payment_providers: [COD_PAYMENT_PROVIDER_ID, "pp_system_default"] },
    },
  });

  // Stock location.
  let [location] = await stockLocationService.listStockLocations({}, { take: 1 });
  if (!location) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: input.countryName,
            address: { address_1: "", country_code: input.country.toUpperCase() },
          },
        ],
      },
    });
    location = result[0];
    logger.info("Stock location created");
  }
  if (!location) throw new Error("Could not create the stock location");
  const locationId = location.id;

  await updateStoresWorkflow(container).run({
    input: { selector: { id: input.storeId }, update: { default_location_id: locationId } },
  });
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: locationId, add: [input.salesChannelId] },
  });

  const { data: providerLinks } = await query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_providers.id", "fulfillment_sets.id"],
    filters: { id: locationId },
  });
  const linked = (providerLinks[0] ?? {}) as {
    fulfillment_providers?: { id: string }[];
    fulfillment_sets?: { id: string }[];
  };
  if (!linked.fulfillment_providers?.some((provider) => provider.id === MANUAL_COD_PROVIDER_ID)) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: MANUAL_COD_PROVIDER_ID },
    });
  }

  // Shipping profile.
  let [profile] = await fulfillmentService.listShippingProfiles({ type: "default" }, { take: 1 });
  if (!profile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: input.countryName, type: "default" }] },
    });
    profile = result[0];
  }
  if (!profile) throw new Error("Could not create the shipping profile");

  // Fulfillment set and service zone for the country.
  let fulfillmentSetId = linked.fulfillment_sets?.[0]?.id;
  if (!fulfillmentSetId) {
    const set = await fulfillmentService.createFulfillmentSets({
      name: `${input.countryName} COD`,
      type: "shipping",
      service_zones: [
        {
          name: input.countryName,
          geo_zones: [{ type: "country", country_code: input.country }],
        },
      ],
    });
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: locationId },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id },
    });
    fulfillmentSetId = set.id;
    logger.info("COD fulfillment set created");
  }
  const [set] = await fulfillmentService.listFulfillmentSets(
    { id: fulfillmentSetId },
    { relations: ["service_zones"] },
  );
  const serviceZoneId = set?.service_zones[0]?.id;
  if (!serviceZoneId) throw new Error("COD fulfillment set has no service zone");

  // Calculated shipping option.
  const options = await fulfillmentService.listShippingOptions({}, { take: null });
  if (!options.some((option) => option.provider_id === MANUAL_COD_PROVIDER_ID)) {
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "COD",
          price_type: "calculated",
          provider_id: MANUAL_COD_PROVIDER_ID,
          service_zone_id: serviceZoneId,
          shipping_profile_id: profile.id,
          data: { id: "manual-cod" },
          type: { label: "COD", description: "", code: COD_SHIPPING_TYPE_CODE },
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info("COD shipping option created");
  }
}

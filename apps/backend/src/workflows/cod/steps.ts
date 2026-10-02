import type {
  IFulfillmentModuleService,
  IOrderModuleService,
  IStoreModuleService,
  Query,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { type Locale, toMedusaLocale } from "@nocido/types";
import { MANUAL_COD_PROVIDER_ID } from "../../modules/manual-cod";
import { MOROCCAN_CITIES_MODULE } from "../../modules/moroccan-cities";
import { codShippingFee, type ResolvedCity } from "../../modules/moroccan-cities/lib/cities";
import type MoroccanCitiesModuleService from "../../modules/moroccan-cities/service";
import { STORE_SETTINGS_MODULE } from "../../modules/store-settings";
import type StoreSettingsModuleService from "../../modules/store-settings/service";
import { codEmail, type CodStatus, splitName } from "./lib";

export interface CodCustomerInput {
  /** Full name as typed in the form. */
  name: string;
  /** E.164, already normalized by moroccanPhoneSchema. */
  phone: string;
  /** Optional real address for notifications. */
  email?: string;
}

export interface CodContextInput {
  customer: CodCustomerInput;
  city_id: string;
  address?: string;
  note?: string;
  locale?: Locale;
}

export interface CodAddress {
  first_name: string;
  last_name: string;
  phone: string;
  address_1: string;
  city: string;
  country_code: string;
  metadata: Record<string, unknown>;
}

export interface CodContext {
  regionId: string;
  salesChannelId: string;
  shippingOptionId: string;
  email: string;
  address: CodAddress;
  city: ResolvedCity;
  freeShippingThreshold: number | null;
  minOrderAmount: number;
  /** Medusa locale of the cart ("fr-MA"): line item titles are translated into it. */
  cartLocale: string;
  metadata: Record<string, unknown>;
}

/** Everything the COD order needs, read server-side: settings, city, region, shipping option. */
export const resolveCodContextStep = createStep(
  "resolve-cod-context",
  async (input: CodContextInput, { container }) => {
    const settingsService = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
    const citiesService = container.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
    const storeService = container.resolve<IStoreModuleService>(Modules.STORE);
    const fulfillmentService = container.resolve<IFulfillmentModuleService>(Modules.FULFILLMENT);

    const settings = await settingsService.getSettings();
    if (!settings.commerce.codEnabled) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "cod.disabled");
    }
    const city = await citiesService.getActiveCity(input.city_id);

    const [store] = await storeService.listStores({}, { take: 1 });
    if (!store?.default_region_id || !store.default_sales_channel_id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "cod.storeNotSetUp");
    }
    const options = await fulfillmentService.listShippingOptions({}, { take: null });
    const option = options.find((candidate) => candidate.provider_id === MANUAL_COD_PROVIDER_ID);
    if (!option) throw new MedusaError(MedusaError.Types.INVALID_DATA, "cod.storeNotSetUp");

    const { first, last } = splitName(input.customer.name);
    const cityName = city.name.fr ?? city.name.ar ?? city.slug;
    const address: CodAddress = {
      first_name: first,
      last_name: last,
      phone: input.customer.phone,
      address_1: input.address?.trim() ? input.address.trim() : cityName,
      city: cityName,
      country_code: settings.contact.country.toLowerCase(),
      metadata: { city_id: city.id, city_slug: city.slug },
    };

    const context: CodContext = {
      regionId: store.default_region_id,
      salesChannelId: store.default_sales_channel_id,
      shippingOptionId: option.id,
      // A real address when given (notifications), else the technical one.
      email: input.customer.email?.trim()
        ? input.customer.email.trim().toLowerCase()
        : codEmail(input.customer.phone, settings.commerce.technicalEmailDomain),
      address,
      city,
      freeShippingThreshold: settings.commerce.freeShippingThreshold,
      minOrderAmount: settings.commerce.minOrderAmount,
      cartLocale: toMedusaLocale(
        input.locale ?? settings.localization.defaultLocale,
        settings.contact.country,
      ),
      metadata: {
        cod: true,
        customer_name: input.customer.name.trim(),
        customer_phone: input.customer.phone,
        city_id: city.id,
        locale: input.locale ?? settings.localization.defaultLocale,
        ...(input.note?.trim() ? { customer_note: input.note.trim() } : {}),
      },
    };
    return new StepResponse(context);
  },
);

/**
 * Delivery fee from the city and the free shipping threshold, checked
 * against the minimum order amount. Uses the cart item total (tax included).
 */
export const computeCodFeeStep = createStep(
  "compute-cod-fee",
  async (input: { cartId: string; context: CodContext }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "item_total", "items.id"],
      filters: { id: input.cartId },
    });
    const cart = data[0] as { item_total?: number | string; items?: unknown[] } | undefined;
    if (!cart?.items?.length)
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "cod.emptyCart");

    const subtotal = Number(cart.item_total ?? 0);
    if (subtotal < input.context.minOrderAmount) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "cod.belowMinimum");
    }
    const fee = codShippingFee(
      input.context.city.fee,
      subtotal,
      input.context.freeShippingThreshold,
    );
    return new StepResponse({ fee });
  },
);

/** Payment collection created for the cart by createPaymentCollectionForCartWorkflow. */
export const getCartPaymentCollectionStep = createStep(
  "get-cart-payment-collection",
  async (input: { cartId: string }, { container }) => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY);
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "payment_collection.id"],
      filters: { id: input.cartId },
    });
    const id = (data[0] as { payment_collection?: { id: string } } | undefined)?.payment_collection
      ?.id;
    if (!id) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "cod.noPaymentCollection");
    return new StepResponse({ id });
  },
);

interface OrderMetadataUpdate {
  orderId: string;
  metadata: Record<string, unknown>;
}

/** Merges keys into the order metadata; compensation puts the previous metadata back. */
export const updateOrderMetadataStep = createStep(
  "update-order-cod-metadata",
  async (input: OrderMetadataUpdate, { container }) => {
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
    const order = await orderService.retrieveOrder(input.orderId, { select: ["id", "metadata"] });
    const previous = order.metadata ?? {};
    await orderService.updateOrders([
      { id: input.orderId, metadata: { ...previous, ...input.metadata } },
    ]);
    return new StepResponse({ ...previous, ...input.metadata }, { id: input.orderId, previous });
  },
  async (compensation, { container }) => {
    if (!compensation) return;
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
    await orderService.updateOrders([{ id: compensation.id, metadata: compensation.previous }]);
  },
);

export interface CodOrderSummary {
  id: string;
  status: string;
  codStatus: CodStatus | null;
  metadata: Record<string, unknown>;
}

/** Reads an order with its COD status for the confirm-cod workflow. */
export const loadCodOrderStep = createStep(
  "load-cod-order",
  async (input: { orderId: string }, { container }) => {
    const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
    const order = await orderService.retrieveOrder(input.orderId, {
      select: ["id", "status", "metadata"],
    });
    const metadata = order.metadata ?? {};
    if (metadata.cod !== true) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "cod.notCod");
    const summary: CodOrderSummary = {
      id: order.id,
      status: order.status,
      codStatus: (metadata.cod_status as CodStatus | undefined) ?? null,
      metadata,
    };
    return new StepResponse(summary);
  },
);

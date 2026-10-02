import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { generateTokensOrFallback } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import { resolveLocalized, type StoreSettings } from "@nocido/types";
import {
  MOROCCAN_CITIES_MODULE,
  type MoroccanCitiesModuleService,
} from "../../modules/moroccan-cities";
import { STORE_SETTINGS_MODULE } from "../../modules/store-settings";
import type StoreSettingsModuleService from "../../modules/store-settings/service";
import { pdfRenderer } from "./renderer";
import {
  buildDeliveryNoteHtml,
  buildInvoiceHtml,
  type DocumentOrder,
  type DocumentSeller,
  invoiceNumber,
} from "./templates";

export const DOCUMENT_TYPES = ["invoice", "delivery-note"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

const amount = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** Documents are French: French texts first, then the store default language. */
export function sellerFrom(settings: StoreSettings): DocumentSeller {
  const fallbacks = [settings.localization.defaultLocale];
  const fr = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, "fr", fallbacks);
  const colors = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG).colors.light;
  const { billing, contact } = settings;
  return {
    storeName: fr(settings.identity.storeName),
    legalName: billing.legalName,
    logoUrl: settings.identity.logoLight?.url ?? null,
    address: fr(contact.address),
    city: contact.city,
    phone: contact.phone ?? "",
    email: contact.email ?? "",
    ice: billing.ice,
    rc: billing.rc,
    if: billing.if,
    patente: billing.patente,
    cnss: billing.cnss,
    tva: billing.tva,
    invoicePrefix: billing.invoicePrefix,
    footer: fr(billing.invoiceFooter),
    timezone: settings.localization.timezone,
    colors: {
      fg: colors.fg,
      muted: colors.mutedFg,
      border: colors.border,
      primary: colors.primary,
      primaryFg: colors.primaryFg,
      surface: colors.muted,
    },
  };
}

interface OrderRow {
  id: string;
  display_id: number;
  created_at: Date | string;
  currency_code: string;
  item_total: unknown;
  shipping_total: unknown;
  total: unknown;
  metadata?: Record<string, unknown> | null;
  shipping_address?: { address_1?: string | null; city?: string | null } | null;
  items?: ({
    title: string;
    product_title?: string | null;
    variant_title?: string | null;
    quantity: unknown;
    unit_price: unknown;
    total: unknown;
  } | null)[];
}

/** COD order for the documents, or null when it is not a COD order. */
export async function loadDocumentOrder(
  container: MedusaContainer,
  orderId: string,
  settings: StoreSettings,
): Promise<DocumentOrder | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "created_at",
      "currency_code",
      "item_total",
      "shipping_total",
      "total",
      "metadata",
      "shipping_address.address_1",
      "shipping_address.city",
      "items.title",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.unit_price",
      "items.total",
    ],
    filters: { id: orderId },
  });
  const order = data[0] as unknown as OrderRow | undefined;
  const metadata = order?.metadata ?? {};
  if (!order || metadata.cod !== true) return null;

  let cityName = order.shipping_address?.city ?? "";
  const cityId = text(metadata.city_id);
  if (cityId) {
    const cities = container.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
    const city = (await cities.listResolvedCities()).find((candidate) => candidate.id === cityId);
    if (city) cityName = resolveLocalized(city.name, "fr", [settings.localization.defaultLocale]);
  }
  const note = text(metadata.customer_note).trim();

  return {
    displayId: order.display_id,
    createdAt: new Date(order.created_at).toISOString(),
    currency: order.currency_code,
    customerName: text(metadata.customer_name),
    customerPhone: text(metadata.customer_phone),
    address: order.shipping_address?.address_1 ?? "",
    cityName,
    note: note === "" ? null : note,
    items: (order.items ?? [])
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        title: item.product_title ?? item.title,
        variant: item.variant_title ?? null,
        quantity: amount(item.quantity),
        unitPrice: amount(item.unit_price),
        total: amount(item.total),
      })),
    itemTotal: amount(order.item_total),
    shippingTotal: amount(order.shipping_total),
    total: amount(order.total),
  };
}

export interface RenderedDocument {
  filename: string;
  pdf: Buffer;
}

/** Invoice or delivery note of a COD order as a PDF. Null when the order is not COD. */
export async function renderOrderDocument(
  container: MedusaContainer,
  orderId: string,
  type: DocumentType,
): Promise<RenderedDocument | null> {
  const settings = await container
    .resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
    .getSettings();
  const order = await loadDocumentOrder(container, orderId, settings);
  if (!order) return null;
  const seller = sellerFrom(settings);
  const html =
    type === "invoice" ? buildInvoiceHtml(order, seller) : buildDeliveryNoteHtml(order, seller);
  const filename =
    type === "invoice"
      ? `${invoiceNumber(order, seller)}.pdf`
      : `BL-${String(order.displayId).padStart(6, "0")}.pdf`;
  return { filename, pdf: await pdfRenderer().render(html) };
}

/** Latest COD order, for previews in the admin. */
export async function latestCodOrderId(container: MedusaContainer): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    pagination: { take: 20, order: { created_at: "DESC" } },
  });
  const latest = (data as { id: string; metadata?: Record<string, unknown> | null }[]).find(
    (order) => order.metadata?.cod === true,
  );
  return latest?.id ?? null;
}

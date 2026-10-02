import type { Logger, MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { generateTokensOrFallback } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import { isLocale, type Locale, resolveLocalized, type StoreSettings } from "@nocido/types";
import {
  MOROCCAN_CITIES_MODULE,
  type MoroccanCitiesModuleService,
} from "../../modules/moroccan-cities";
import { STORE_SETTINGS_MODULE } from "../../modules/store-settings";
import type StoreSettingsModuleService from "../../modules/store-settings/service";
import { createSmtpTransport, fromAddress, SmtpNotConfiguredError } from "../mailer";
import type { NotificationKind } from "./messages";
import {
  type NotificationBranding,
  type NotificationOrder,
  renderOrderEmail,
  renderWhatsAppText,
} from "./template";
import { whatsappChannel } from "./whatsapp";

export type { NotificationKind } from "./messages";
export { NOTIFICATION_KINDS } from "./messages";

const amount = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const text = (value: unknown): string => (typeof value === "string" ? value : "");
/** Settings use "" for "not set". */
const filled = (value: string | null | undefined): string | null =>
  value?.trim() ? value.trim() : null;

export function brandingFrom(settings: StoreSettings, locale: Locale): NotificationBranding {
  const colors = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG).colors.light;
  const fallbacks = [settings.localization.defaultLocale];
  return {
    storeName: resolveLocalized(settings.identity.storeName, locale, fallbacks),
    logoUrl: settings.identity.logoLight?.url ?? null,
    legalName: settings.billing.legalName,
    numberingSystem: settings.localization.numberingSystem,
    colors: {
      bg: colors.bg,
      card: colors.card,
      cardFg: colors.cardFg,
      primary: colors.primary,
      primaryFg: colors.primaryFg,
      mutedFg: colors.mutedFg,
      border: colors.border,
    },
    contact: {
      phone: filled(settings.contact.phone),
      whatsapp: filled(settings.contact.whatsapp),
      email: filled(settings.contact.email),
    },
  };
}

/** Public links of the emails: storefront tracking page and admin order page. */
export function notificationLinks(order: { id: string; locale: Locale }) {
  const storefront = filled(process.env.STOREFRONT_URL)?.replace(/\/$/, "");
  const backend = filled(process.env.MEDUSA_BACKEND_URL) ?? "http://localhost:9000";
  const admin = (filled(process.env.ADMIN_URL) ?? `${backend}/app`).replace(/\/$/, "");
  return {
    track: storefront ? `${storefront}/${order.locale}/order/${order.id}` : null,
    admin: `${admin}/orders/${order.id}`,
  };
}

interface OrderRow {
  id: string;
  display_id: number;
  email?: string | null;
  currency_code: string;
  item_total: unknown;
  shipping_total: unknown;
  total: unknown;
  metadata?: Record<string, unknown> | null;
  shipping_address?: { city?: string | null } | null;
  items?: ({
    title: string;
    product_title?: string | null;
    variant_title?: string | null;
    quantity: unknown;
    total: unknown;
  } | null)[];
}

/** COD order in the shape the templates need, or null when it is not a COD order. */
export async function loadNotificationOrder(
  container: MedusaContainer,
  orderId: string,
  settings: StoreSettings,
): Promise<NotificationOrder | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "currency_code",
      "item_total",
      "shipping_total",
      "total",
      "metadata",
      "shipping_address.city",
      "items.title",
      "items.product_title",
      "items.variant_title",
      "items.quantity",
      "items.total",
    ],
    filters: { id: orderId },
  });
  const order = data[0] as unknown as OrderRow | undefined;
  const metadata = order?.metadata ?? {};
  if (!order || metadata.cod !== true) return null;

  const locale = isLocale(metadata.locale) ? metadata.locale : settings.localization.defaultLocale;
  const email = order.email?.trim().toLowerCase() ?? "";
  const technical = email.endsWith(`@${settings.commerce.technicalEmailDomain.toLowerCase()}`);

  let cityName = order.shipping_address?.city ?? "";
  const cityId = text(metadata.city_id);
  if (cityId) {
    const cities = container.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
    const city = (await cities.listResolvedCities()).find((candidate) => candidate.id === cityId);
    if (city) cityName = resolveLocalized(city.name, locale, [settings.localization.defaultLocale]);
  }

  return {
    id: order.id,
    displayId: order.display_id,
    locale,
    currency: order.currency_code,
    email: email && !technical ? email : null,
    fullName: text(metadata.customer_name),
    phone: text(metadata.customer_phone),
    cityName,
    items: (order.items ?? [])
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        title: item.product_title ?? item.title,
        variant: item.variant_title ?? null,
        quantity: amount(item.quantity),
        total: amount(item.total),
      })),
    itemTotal: amount(order.item_total),
    shippingTotal: amount(order.shipping_total),
    total: amount(order.total),
  };
}

/** Store inbox for new order alerts: contact email, else the SMTP sender. */
function merchantAddress(settings: StoreSettings): string | null {
  return filled(settings.contact.email) ?? filled(settings.smtp.fromEmail);
}

/**
 * Sends the notification of one COD order event: email to the customer
 * (when they gave an address), WhatsApp message (stub channel), and for a
 * new order an alert to the store. Never throws: failures are logged so the
 * order workflow is never affected.
 */
export async function notifyOrder(
  container: MedusaContainer,
  orderId: string,
  kind: Exclude<NotificationKind, "merchant">,
): Promise<void> {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER);
  try {
    const settingsService = container.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
    const settings = await settingsService.getSettings();
    const order = await loadNotificationOrder(container, orderId, settings);
    if (!order) return;

    const links = notificationLinks(order);
    const branding = brandingFrom(settings, order.locale);

    await whatsappChannel().send(
      { to: order.phone, text: renderWhatsAppText(kind, order, branding, links.track) },
      logger,
    );

    const messages: { to: string; message: ReturnType<typeof renderOrderEmail> }[] = [];
    if (order.email) {
      messages.push({ to: order.email, message: renderOrderEmail(kind, order, branding, links) });
    }
    const merchant = kind === "placed" ? merchantAddress(settings) : null;
    if (merchant) {
      const merchantLocale = settings.localization.defaultLocale;
      const merchantOrder = { ...order, locale: merchantLocale };
      messages.push({
        to: merchant,
        message: renderOrderEmail(
          "merchant",
          merchantOrder,
          brandingFrom(settings, merchantLocale),
          notificationLinks(merchantOrder),
        ),
      });
    }
    if (messages.length === 0) return;

    let transport;
    try {
      transport = createSmtpTransport(settings.smtp, await settingsService.getSmtpPassword());
    } catch (error) {
      if (error instanceof SmtpNotConfiguredError) {
        logger.info(`[notifications] SMTP not configured, ${kind} email skipped for ${orderId}`);
        return;
      }
      throw error;
    }
    for (const { to, message } of messages) {
      await transport.sendMail({
        from: fromAddress(settings.smtp),
        to,
        replyTo: filled(settings.contact.email) ?? undefined,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
    }
    logger.info(`[notifications] ${kind} sent for ${orderId} (${messages.length} email(s))`);
  } catch (error) {
    logger.error(
      `[notifications] ${kind} failed for ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

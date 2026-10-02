import type { AuthenticatedMedusaRequest } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { isLocale, type Locale } from "@nocido/types";
import { z } from "zod";
import { STORE_SETTINGS_MODULE } from "../../modules/store-settings";
import type StoreSettingsModuleService from "../../modules/store-settings/service";
import { brandingFrom, loadNotificationOrder, notificationLinks } from ".";
import { NOTIFICATION_KINDS } from "./messages";
import { renderOrderEmail, type RenderedMessage } from "./template";

export const sampleSchema = z.object({
  kind: z.enum(NOTIFICATION_KINDS),
  locale: z.string().refine(isLocale, "locale.invalid"),
});

/**
 * One notification rendered with the latest COD order, in the requested
 * language, so the admin sees real content. Null when no COD order exists.
 */
export async function renderSample(
  req: AuthenticatedMedusaRequest,
  kind: (typeof NOTIFICATION_KINDS)[number],
  locale: Locale,
): Promise<RenderedMessage | null> {
  const settings = await req.scope
    .resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE)
    .getSettings();
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "metadata"],
    pagination: { take: 20, order: { created_at: "DESC" } },
  });
  const latest = (data as { id: string; metadata?: Record<string, unknown> | null }[]).find(
    (order) => order.metadata?.cod === true,
  );
  if (!latest) return null;
  const order = await loadNotificationOrder(req.scope, latest.id, settings);
  if (!order) return null;
  const localized = { ...order, locale };
  return renderOrderEmail(
    kind,
    localized,
    brandingFrom(settings, locale),
    notificationLinks(localized),
  );
}

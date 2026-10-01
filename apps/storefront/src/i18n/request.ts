import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getStoreSettings } from "@/lib/settings";
import { routing } from "./routing";

/** Messages and formats for the current locale. UI copy only: store content comes from StoreSettings. */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const settings = await getStoreSettings();
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : settings.localization.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };

  return {
    locale,
    messages: messages.default,
    timeZone: settings.localization.timezone,
    formats: {
      number: {
        price: {
          style: "currency",
          currency: settings.localization.defaultCurrency,
          numberingSystem: settings.localization.numberingSystem,
        },
      },
    },
  };
});

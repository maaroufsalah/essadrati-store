import type { Locale, NumberingSystem, PublicStoreSettings } from "@nocido/types";

/** Everything needed to format prices and numbers the way the store is set up. */
export interface StoreFormat {
  locale: Locale;
  currency: string;
  numberingSystem: NumberingSystem;
}

export function storeFormat(settings: PublicStoreSettings, locale: Locale): StoreFormat {
  return {
    locale,
    currency: settings.localization.defaultCurrency,
    numberingSystem: settings.localization.numberingSystem,
  };
}

/** BCP 47 tag with the store digits forced: ar + latn -> "ar-u-nu-latn". */
function tag(format: StoreFormat): string {
  return `${format.locale}-u-nu-${format.numberingSystem}`;
}

/** 300 -> "300 MAD" / "300,00 MAD"... Whole amounts drop their decimals. */
export function formatPrice(amount: number, format: StoreFormat): string {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(tag(format), {
    style: "currency",
    currency: format.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(
  value: number,
  format: StoreFormat,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(tag(format), options).format(value);
}

/** Rounded discount percentage, or null when there is no real discount. */
export function discountPercent(
  amount: number,
  original: number | null | undefined,
): number | null {
  if (!original || original <= amount) return null;
  const percent = Math.round(((original - amount) / original) * 100);
  return percent > 0 ? percent : null;
}

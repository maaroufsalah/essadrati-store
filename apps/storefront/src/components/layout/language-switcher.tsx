"use client";

import type { Locale } from "@nocido/types";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Each language named in itself: العربية, Français, English. */
function nativeName(locale: Locale): string {
  const name = new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale;
  return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
}

/** Links to the current page in every enabled locale. */
export function LanguageSwitcher({
  locales,
  className,
}: {
  locales: Locale[];
  className?: string;
}) {
  const t = useTranslations("language");
  const current = useLocale();
  const pathname = usePathname();

  if (locales.length < 2) return null;

  return (
    <nav aria-label={t("label")} className={cn("flex items-center gap-1", className)}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          lang={locale}
          hrefLang={locale}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "touch-target rounded-base inline-flex items-center justify-center px-2 text-sm",
            locale === current ? "bg-muted text-fg font-semibold" : "text-muted-fg hover:text-fg",
          )}
        >
          {nativeName(locale)}
        </Link>
      ))}
    </nav>
  );
}

import { isLocale, resolveLocalized } from "@nocido/types";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/** Placeholder home: identity from StoreSettings. Sections arrive with the catalog. */
export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);

  const [settings, t] = await Promise.all([getStoreSettings(), getTranslations("home")]);
  const fallbacks = [settings.localization.defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const tagline = resolveLocalized(settings.identity.tagline, locale, fallbacks);

  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-20 sm:px-6 md:py-28">
      <h1 className="text-fg animate-in fade-in slide-in-from-bottom-3 max-w-3xl text-4xl leading-tight font-bold duration-500 md:text-6xl">
        {t("welcome", { storeName })}
      </h1>
      {tagline ? (
        <p className="text-muted-fg animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards max-w-2xl text-lg delay-100 duration-500 md:text-xl">
          {tagline}
        </p>
      ) : null}
    </section>
  );
}

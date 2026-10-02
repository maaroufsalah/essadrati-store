import { type Locale, type PublicStoreSettings, resolveLocalized } from "@nocido/types";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AnnouncementBar } from "./announcement-bar";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { NAV_ITEMS } from "./nav-items";
import { StoreLogo } from "./store-logo";
import { CartButton } from "@/components/cart/cart-button";
import { ThemeToggle } from "./theme-toggle";

interface SiteHeaderProps {
  settings: PublicStoreSettings;
  locale: Locale;
  locales: Locale[];
}

export async function SiteHeader({ settings, locale, locales }: SiteHeaderProps) {
  const t = await getTranslations();
  const fallbacks = [settings.localization.defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const { announcementBar } = settings.marketing;
  const announcement = announcementBar.enabled
    ? resolveLocalized(announcementBar.text, locale, fallbacks)
    : "";

  return (
    <>
      <a
        href="#main"
        className="focus:rounded-base focus:bg-card focus:text-card-fg sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:px-4 focus:py-2"
      >
        {t("common.skipToContent")}
      </a>
      {announcement ? <AnnouncementBar text={announcement} href={announcementBar.href} /> : null}
      <header className="pt-safe border-border bg-bg/90 supports-[backdrop-filter]:bg-bg/75 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
          <MobileNav storeName={storeName} items={NAV_ITEMS} locales={locales} />

          {/* No prefetch: the home page bundle (animations) would compete with the LCP of every page. */}
          <Link
            href="/"
            prefetch={false}
            aria-label={t("header.homeLink", { storeName })}
            className="rounded-base flex min-w-0 items-center"
          >
            <StoreLogo
              name={storeName}
              light={settings.identity.logoLight}
              dark={settings.identity.logoDark}
            />
          </Link>

          <nav
            aria-label={t("header.mainNavigation")}
            className="ms-8 hidden items-center gap-1 md:flex"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-base text-fg hover:bg-muted px-3 py-2 text-sm font-medium"
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher locales={locales} className="hidden md:flex" />
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </header>
    </>
  );
}

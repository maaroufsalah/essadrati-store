import { generateTokensOrFallback } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import { directionOf, LOCALES, resolveLocalized, toWhatsAppNumber } from "@nocido/types";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartProvider } from "@/components/cart/cart-provider";
import { FloatingWhatsApp } from "@/components/layout/floating-whatsapp";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { publicEnv } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";
import { storeFormat } from "@/lib/format";
import { routingFromSettings } from "@/lib/locale";
import { getStoreSettings } from "@/lib/settings";
import "../globals.css";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) return {};
  const settings = await getStoreSettings();
  const fallbacks = [settings.localization.defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const title = resolveLocalized(settings.seo.metaTitle, locale, fallbacks) || storeName;
  const description =
    resolveLocalized(settings.seo.metaDescription, locale, fallbacks) ||
    resolveLocalized(settings.identity.tagline, locale, fallbacks);
  const { locales } = routingFromSettings(settings);
  const { favicon, ogImage } = settings.identity;

  return {
    metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
    title: { default: title, template: `%s | ${storeName}` },
    description: description || undefined,
    applicationName: storeName,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(locales.map((code) => [code, `/${code}`])),
    },
    icons: favicon ? { icon: favicon.url } : undefined,
    openGraph: {
      type: "website",
      siteName: storeName,
      title,
      description: description || undefined,
      locale,
      images: ogImage
        ? [{ url: ogImage.url, width: ogImage.width, height: ogImage.height }]
        : undefined,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const settings = await getStoreSettings();
  const tokens = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG);
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: tokens.colors.light.bg },
      { media: "(prefers-color-scheme: dark)", color: tokens.colors.dark.bg },
    ],
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!hasLocale(LOCALES, locale)) notFound();
  setRequestLocale(locale);

  const settings = await getStoreSettings();
  const { locales } = routingFromSettings(settings);
  if (!locales.includes(locale)) notFound();

  const tHome = await getTranslations("home");
  const whatsappHref =
    settings.commerce.whatsappOrderEnabled && settings.contact.whatsapp
      ? `https://wa.me/${toWhatsAppNumber(settings.contact.whatsapp)}`
      : null;

  // Validated hex colors, integers and known font stacks only (see @nocido/theme).
  const tokens = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG);
  const fonts = fontVariables([settings.theme.fonts.display, settings.theme.fonts.body]);

  return (
    <html lang={locale} dir={directionOf(locale)} className={fonts} suppressHydrationWarning>
      <head>
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: tokens.css }} />
      </head>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <Providers defaultMode={settings.theme.defaultMode}>
            <CartProvider
              format={storeFormat(settings, locale)}
              freeShippingThreshold={settings.commerce.freeShippingThreshold}
            >
              <SiteHeader settings={settings} locale={locale} locales={locales} />
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter settings={settings} locale={locale} />
              <CartDrawer />
              {whatsappHref ? (
                <FloatingWhatsApp href={whatsappHref} label={tHome("whatsappCta")} />
              ) : null}
            </CartProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

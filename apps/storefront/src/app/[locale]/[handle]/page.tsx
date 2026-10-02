import { isLocale, type Locale, type Page, resolveLocalized } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Markdown } from "@/components/content/markdown";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { getPage } from "@/lib/pages";
import { alternatesFor } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string; handle: string }>;
}

/** Pages are rendered on first visit, then cached (ISR, `pages` tag). */
export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

async function localizedPage(page: Page, locale: Locale) {
  const settings = await getStoreSettings();
  const fallbacks = [settings.localization.defaultLocale];
  const text = (value: Page["title"]) => resolveLocalized(value, locale, fallbacks);
  return {
    title: text(page.title),
    content: text(page.content),
    metaTitle: text(page.seo.metaTitle),
    metaDescription: text(page.seo.metaDescription),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  const page = await getPage(handle);
  if (!page) return {};
  const { title, metaTitle, metaDescription } = await localizedPage(page, locale);
  return {
    title: metaTitle || title,
    description: metaDescription || undefined,
    alternates: await alternatesFor(locale, `/${handle}`),
    openGraph: { type: "article", title: metaTitle || title },
  };
}

/** CMS page (our story, FAQ, delivery and returns…), Markdown per locale. */
export default async function CmsPage({ params }: PageProps) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const page = await getPage(handle);
  if (!page) notFound();
  const [{ title, content }, tCommon] = await Promise.all([
    localizedPage(page, locale),
    getTranslations("common"),
  ]);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-14">
      <Breadcrumb
        label={tCommon("breadcrumb")}
        items={[{ label: tCommon("home"), href: "/" }, { label: title }]}
      />
      <h1 className="font-display text-fg text-3xl font-bold text-balance sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {content ? <Markdown>{content}</Markdown> : null}
    </article>
  );
}

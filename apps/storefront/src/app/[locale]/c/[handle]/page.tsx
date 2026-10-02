import { isLocale } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CategoryResults } from "@/components/category/category-results";
import { ResultsSkeleton } from "@/components/category/results-skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { getCategoryByHandle } from "@/lib/catalog";
import { parseFilters, toSearchParams } from "@/lib/category";
import { storeFormat } from "@/lib/format";
import { alternatesFor, ogImage } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  const [category, t] = await Promise.all([
    getCategoryByHandle(locale, handle),
    getTranslations({ locale, namespace: "category" }),
  ]);
  if (!category) return {};
  return {
    title: t("metaTitle", { category: category.name }),
    description: category.description || t("metaDescription", { category: category.name }),
    alternates: await alternatesFor(locale, `/c/${handle}`),
    openGraph: {
      type: "website",
      locale,
      title: t("metaTitle", { category: category.name }),
      images: [ogImage(locale, "c", handle)],
    },
  };
}

/**
 * The category is resolved before anything streams, so an unknown handle is
 * a real 404 (no loading.tsx on this segment). Products stream behind a
 * skeleton, keyed on the filters so each change shows it again.
 */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const category = await getCategoryByHandle(locale, handle);
  if (!category) notFound();

  const [settings, query, t, tCommon] = await Promise.all([
    getStoreSettings(),
    searchParams,
    getTranslations("category"),
    getTranslations("common"),
  ]);
  const filters = parseFilters(query);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb
        label={t("breadcrumb")}
        items={[{ label: tCommon("home"), href: "/" }, { label: category.name }]}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-fg text-3xl font-bold sm:text-4xl">{category.name}</h1>
        {category.description ? (
          <p className="text-muted-fg max-w-3xl">{category.description}</p>
        ) : null}
      </header>
      <Suspense key={toSearchParams(filters).toString()} fallback={<ResultsSkeleton />}>
        <CategoryResults
          locale={locale}
          categoryId={category.id}
          basePath={`/c/${handle}`}
          filters={filters}
          format={storeFormat(settings, locale)}
        />
      </Suspense>
    </div>
  );
}

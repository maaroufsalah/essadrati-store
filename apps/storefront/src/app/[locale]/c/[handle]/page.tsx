import { isFiltered, isLocale } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView, catalogQuery } from "@/components/catalog/catalog-view";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { getCategoryByHandle } from "@/lib/catalog";
import { catalogAlternates, ogImage } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string; handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  const [category, t, raw] = await Promise.all([
    getCategoryByHandle(locale, handle),
    getTranslations({ locale, namespace: "category" }),
    searchParams,
  ]);
  if (!category) return {};
  const query = await catalogQuery(raw, handle);
  const name = t("metaTitle", { category: category.name });
  return {
    // Every page of the series has its own title.
    title: query.page > 1 ? t("pageTitle", { title: name, page: query.page }) : name,
    description: category.description || t("metaDescription", { category: category.name }),
    ...(await catalogAlternates(locale, `/c/${handle}`, {
      page: query.page,
      filtered: isFiltered(query),
      sorted: query.sort !== "relevance",
    })),
    openGraph: {
      type: "website",
      locale,
      title: t("metaTitle", { category: category.name }),
      images: [ogImage(locale, "c", handle)],
    },
  };
}

/**
 * The category is resolved before anything renders, so an unknown handle
 * is a real 404. Filters, sort and page live in the URL.
 */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const category = await getCategoryByHandle(locale, handle);
  if (!category) notFound();
  const [raw, t, tCommon] = await Promise.all([
    searchParams,
    getTranslations("category"),
    getTranslations("common"),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <Breadcrumb
        locale={locale}
        label={t("breadcrumb")}
        items={[
          { label: tCommon("home"), href: "/" },
          { label: t("allTitle"), href: "/products" },
          { label: category.name },
        ]}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-fg text-3xl font-bold sm:text-4xl">{category.name}</h1>
        {category.description ? (
          <p className="text-muted-fg max-w-3xl">{category.description}</p>
        ) : null}
      </header>
      <CatalogView locale={locale} basePath={`/c/${handle}`} raw={raw} scopeCategory={handle} />
    </div>
  );
}

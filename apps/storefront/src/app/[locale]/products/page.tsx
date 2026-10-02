import { isFiltered, isLocale } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogView, catalogQuery } from "@/components/catalog/catalog-view";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { catalogAlternates } from "@/lib/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const [t, raw] = await Promise.all([
    getTranslations({ locale, namespace: "category" }),
    searchParams,
  ]);
  const query = await catalogQuery(raw);
  return {
    title:
      query.page > 1 ? t("pageTitle", { title: t("allTitle"), page: query.page }) : t("allTitle"),
    description: t("allDescription"),
    ...(await catalogAlternates(locale, "/products", {
      page: query.page,
      filtered: isFiltered(query),
      sorted: query.sort !== "relevance",
    })),
    openGraph: { type: "website", locale, title: t("allTitle"), description: t("allDescription") },
  };
}

/** Every published product, with the same filters as the category pages. */
export default async function ProductsPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
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
        items={[{ label: tCommon("home"), href: "/" }, { label: t("allTitle") }]}
      />
      <header className="flex flex-col gap-2">
        <h1 className="text-fg text-3xl font-bold sm:text-4xl">{t("allTitle")}</h1>
        <p className="text-muted-fg max-w-3xl">{t("allDescription")}</p>
      </header>
      <CatalogView locale={locale} basePath="/products" raw={raw} />
    </div>
  );
}

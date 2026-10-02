import {
  type HomeSectionId,
  isLocale,
  type Locale,
  normalizeHomeSections,
  resolveLocalized,
  toWhatsAppNumber,
} from "@nocido/types";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fragment, type ReactNode } from "react";
import { CategoryBanners } from "@/components/home/category-banners";
import { CategoryGrid } from "@/components/home/category-grid";
import { Hero } from "@/components/home/hero";
import { HeroSlider } from "@/components/home/hero-slider";
import { ProductRail } from "@/components/home/product-rail";
import { ProductSpotlight } from "@/components/home/product-spotlight";
import { SectionHeading } from "@/components/home/section-heading";
import { StorySection } from "@/components/home/story-section";
import { Testimonials } from "@/components/home/testimonials";
import { TrustBar } from "@/components/home/trust-bar";
import { listCategories, listCollections, listProductCards } from "@/lib/catalog";
import { formatNumber, storeFormat } from "@/lib/format";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategoryBanners, getHeroSlides } from "@/lib/home-content";
import { organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";
import { alternatesFor, ogImage, siteUrl } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const settings = await getStoreSettings();
  const fallbacks = [settings.localization.defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const title = resolveLocalized(settings.seo.metaTitle, locale, fallbacks) || storeName;
  // The kit wording backs up an empty description (unset SEO, or settings unreachable).
  const tCategory = await getTranslations({ locale, namespace: "category" });
  const description =
    resolveLocalized(settings.seo.metaDescription, locale, fallbacks) ||
    resolveLocalized(settings.identity.tagline, locale, fallbacks) ||
    tCategory("allDescription");
  const { ogImage: uploaded } = settings.identity;
  return {
    description,
    alternates: await alternatesFor(locale, "/"),
    openGraph: {
      type: "website",
      siteName: storeName,
      locale,
      title,
      description,
      images: [
        uploaded
          ? { url: uploaded.url, width: uploaded.width, height: uploaded.height }
          : ogImage(locale, "home"),
      ],
    },
  };
}

/** Home sections are rebuilt at most hourly, or on demand through the revalidation tags. */
export const revalidate = 3600;

async function loadHome(locale: Locale) {
  const [settings, products, categories, collections, slides, banners] = await Promise.all([
    getStoreSettings(),
    listProductCards(locale, { limit: 24 }),
    listCategories(locale),
    listCollections(locale),
    getHeroSlides(),
    getCategoryBanners(),
  ]);

  const giftHandle = settings.homepage.giftCollectionHandle;
  const giftCollection = giftHandle
    ? collections.find((collection) => collection.handle === giftHandle)
    : undefined;

  const [gifts, categoryImages] = await Promise.all([
    giftCollection
      ? listProductCards(locale, { collectionId: [giftCollection.id], limit: 8 })
      : Promise.resolve([]),
    Promise.all(
      categories.map(async (category) => {
        const [first] = await listProductCards(locale, { categoryId: [category.id], limit: 1 });
        return first?.thumbnail ?? null;
      }),
    ),
  ]);

  // Featured first, then the rest; a full row of 4 (or two) on desktop.
  const ordered = [
    ...products.filter((product) => product.featured),
    ...products.filter((product) => !product.featured),
  ];
  const bestsellerCount = ordered.length >= 8 ? 8 : Math.min(4, ordered.length);
  return {
    settings,
    bestsellers: ordered.slice(0, bestsellerCount),
    categories: categories.map((category, index) => ({
      category,
      image: categoryImages[index] ?? null,
    })),
    gifts,
    giftCollection,
    slides,
    banners,
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) return null;
  setRequestLocale(locale);

  const [
    { settings, bestsellers, categories, gifts, giftCollection, slides, banners },
    t,
    tProduct,
  ] = await Promise.all([loadHome(locale), getTranslations("home"), getTranslations("product")]);
  const fallbacks = [settings.localization.defaultLocale];
  const text = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, locale, fallbacks);
  const format = storeFormat(settings, locale);
  const { hero, story, trust, testimonials } = settings.homepage;
  const storeName = text(settings.identity.storeName);

  const whatsapp =
    settings.commerce.whatsappOrderEnabled && settings.contact.whatsapp
      ? {
          label: t("whatsappCta"),
          href: `https://wa.me/${toWhatsAppNumber(settings.contact.whatsapp)}`,
        }
      : null;

  /** One renderer per block; the admin sets their order and visibility. */
  const blocks: Record<HomeSectionId, () => ReactNode> = {
    // Without active slides, the editorial hero of the settings takes over.
    slider: () =>
      slides.length > 0 ? (
        <HeroSlider
          slides={slides}
          options={settings.homepage.slider}
          locale={locale}
          fallbacks={fallbacks}
          heading={text(settings.seo.metaTitle) || storeName}
        />
      ) : (
        <Hero
          eyebrow={text(hero.eyebrow)}
          title={text(hero.title) || t("welcome", { storeName })}
          subtitle={text(hero.subtitle) || text(settings.identity.tagline)}
          cta={
            hero.ctaHref && text(hero.ctaLabel)
              ? { label: text(hero.ctaLabel), href: hero.ctaHref }
              : null
          }
          whatsapp={whatsapp}
          image={hero.image ? { url: hero.image.url, alt: text(hero.title) } : null}
          products={bestsellers.slice(0, 3)}
        />
      ),

    trust: () => (
      <TrustBar
        label={t("trustTitle")}
        items={trust.map((item) => ({
          icon: item.icon,
          title: text(item.title),
          text: text(item.text),
        }))}
      />
    ),

    // « Nos univers »: the admin banners, or the category tiles without them.
    categories: () =>
      banners.length > 0 ? (
        <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:py-20">
          <SectionHeading title={t("categoriesTitle")} />
          <CategoryBanners
            banners={banners}
            locale={locale}
            fallbacks={fallbacks}
            defaultCta={t("bannerCta")}
          />
        </section>
      ) : categories.length > 0 ? (
        <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:py-20">
          <SectionHeading title={t("categoriesTitle")} />
          <CategoryGrid
            categories={categories.map(({ category, image }) => ({
              handle: category.handle,
              name: category.name,
              description: category.description ?? "",
              image,
              linkLabel: t("shopCategory", { category: category.name }),
            }))}
          />
        </section>
      ) : null,

    bestsellers: () =>
      bestsellers.length > 0 ? (
        <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:py-20">
          <SectionHeading
            title={t("bestsellersTitle")}
            subtitle={t("bestsellersSubtitle")}
            action={
              categories[0]
                ? { href: `/c/${categories[0].category.handle}`, label: t("viewAll") }
                : undefined
            }
          />
          <ProductRail products={bestsellers} format={format} label={t("bestsellersTitle")} />
        </section>
      ) : null,

    story: () => (
      <StorySection
        title={text(story.title)}
        text={text(story.text)}
        image={story.image ? { url: story.image.url, alt: text(story.title) } : null}
        stats={story.stats.map((stat) => ({
          value: stat.value,
          suffix: stat.suffix,
          label: text(stat.label),
        }))}
        cta={story.ctaHref ? { label: t("storyCta"), href: story.ctaHref } : null}
        format={format}
      />
    ),

    gifts: () =>
      giftCollection && gifts.length > 0 ? (
        <section className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:py-20">
          <SectionHeading
            title={giftCollection.title || t("giftsTitle")}
            subtitle={t("giftsSubtitle")}
          />
          {gifts.length <= 2 ? (
            <div className="flex flex-col gap-4">
              {gifts.map((gift) => (
                <ProductSpotlight
                  key={gift.id}
                  product={gift}
                  format={format}
                  ctaLabel={t("viewProduct")}
                />
              ))}
            </div>
          ) : (
            <ProductRail products={gifts} format={format} label={t("giftsTitle")} />
          )}
        </section>
      ) : null,

    testimonials: () =>
      testimonials.length > 0 ? (
        <section className="bg-muted/50">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:py-20">
            <SectionHeading title={t("testimonialsTitle")} />
            <Testimonials
              label={t("testimonialsTitle")}
              items={testimonials.map((item, index) => ({
                key: `${item.name}-${index}`,
                author: item.city
                  ? t("testimonialFrom", { name: item.name, city: item.city })
                  : item.name,
                text: text(item.text),
                rating: item.rating,
                ratingLabel: tProduct("ratingLabel", {
                  rating: formatNumber(item.rating, format),
                  count: 1,
                }),
              }))}
            />
          </div>
        </section>
      ) : null,
  };

  const { contact, identity } = settings;
  const structuredData = [
    organizationJsonLd({
      name: storeName,
      url: siteUrl(`/${locale}`),
      logo: identity.logoLight?.url ?? identity.logoDark?.url ?? null,
      phone: contact.phone,
      email: contact.email,
      sameAs: Object.values(contact.socials).filter((url): url is string => Boolean(url)),
    }),
    websiteJsonLd({
      name: storeName,
      url: siteUrl(`/${locale}`),
      locale,
      searchUrl: siteUrl(`/${locale}/products`),
    }),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      {normalizeHomeSections(settings.homepage.sections)
        .filter((section) => section.enabled)
        .map((section) => (
          <Fragment key={section.id}>{blocks[section.id]()}</Fragment>
        ))}
    </>
  );
}

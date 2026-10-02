/**
 * Kit fallbacks. The storefront and the mobile app use these values only
 * when StoreSettings cannot be loaded, or before the admin fills a field.
 * They are deliberately neutral: client data (name, contact, legal ids)
 * lives in StoreSettings, written by the admin or by the client seed.
 */
import {
  DEFAULT_HOME_SECTIONS,
  type PublicStoreSettings,
  type StoreSettings,
  type ThemeConfig,
  toPublicStoreSettings,
} from "@nocido/types";

/** Héritage doré with Amiri and IBM Plex Sans Arabic: the kit default. */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  presetId: "heritage-dore",
  overrides: { light: {}, dark: {} },
  radius: { base: 12, card: 24, button: "pill" },
  fonts: { display: "amiri", body: "ibm-plex-sans-arabic" },
  defaultMode: "system",
};

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  identity: {
    storeName: { ar: "المتجر", fr: "Boutique", en: "Store" },
    tagline: {},
    logoLight: null,
    logoDark: null,
    favicon: null,
    ogImage: null,
  },
  contact: {
    phone: null,
    whatsapp: null,
    email: null,
    address: {},
    city: "",
    country: "MA",
    mapUrl: null,
    openingHours: {},
    socials: { instagram: null, facebook: null, tiktok: null, youtube: null, snapchat: null },
  },
  billing: {
    legalName: "",
    ice: "",
    rc: "",
    if: "",
    patente: "",
    cnss: "",
    tva: { subject: true, rate: 20 },
    invoicePrefix: "FAC",
    invoiceFooter: {},
    bankName: "",
    rib: "",
  },
  localization: {
    defaultLocale: "ar",
    enabledLocales: ["ar", "fr", "en"],
    defaultCurrency: "MAD",
    timezone: "Africa/Casablanca",
    numberingSystem: "latn",
  },
  theme: DEFAULT_THEME_CONFIG,
  commerce: {
    codEnabled: true,
    freeShippingThreshold: null,
    returnDays: 7,
    whatsappOrderEnabled: true,
    minOrderAmount: 0,
    technicalEmailDomain: "customers.invalid",
  },
  smtp: {
    host: "",
    port: 587,
    secure: false,
    user: "",
    fromName: "",
    fromEmail: "",
    passwordSet: false,
  },
  marketing: {
    gtmId: "",
    metaPixelId: "",
    tiktokPixelId: "",
    ga4Id: "",
    announcementBar: { enabled: false, text: {}, href: null },
  },
  seo: { metaTitle: {}, metaDescription: {} },
  homepage: {
    hero: { eyebrow: {}, title: {}, subtitle: {}, ctaLabel: {}, ctaHref: null, image: null },
    trust: [],
    story: { title: {}, text: {}, image: null, stats: [], ctaHref: null },
    testimonials: [],
    giftCollectionHandle: null,
    sections: DEFAULT_HOME_SECTIONS.map((section) => ({ ...section })),
    slider: { transition: "fade", autoplay: true },
  },
  updatedAt: "1970-01-01T00:00:00.000Z",
};

export const DEFAULT_PUBLIC_STORE_SETTINGS: PublicStoreSettings =
  toPublicStoreSettings(DEFAULT_STORE_SETTINGS);

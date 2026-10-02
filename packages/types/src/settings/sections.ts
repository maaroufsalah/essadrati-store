import { z } from "zod";
import { localeSchema, localizedStringSchema } from "../locale";
import { optionalMediaSchema } from "../media";
import { moroccanPhoneSchema } from "../phone";
import { digitsOrEmpty, domainSchema, hrefSchema, nullableUrl, trackingId } from "./fields";

export const identitySchema = z.object({
  storeName: localizedStringSchema,
  tagline: localizedStringSchema,
  logoLight: optionalMediaSchema,
  logoDark: optionalMediaSchema,
  favicon: optionalMediaSchema,
  ogImage: optionalMediaSchema,
});
export type IdentitySettings = z.infer<typeof identitySchema>;

export const SOCIAL_NETWORKS = ["instagram", "facebook", "tiktok", "youtube", "snapchat"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];

export const socialsSchema = z.object({
  instagram: nullableUrl,
  facebook: nullableUrl,
  tiktok: nullableUrl,
  youtube: nullableUrl,
  snapchat: nullableUrl,
});

export const contactSchema = z.object({
  /** E.164, normalized from any Moroccan format. */
  phone: moroccanPhoneSchema.nullable(),
  whatsapp: moroccanPhoneSchema.nullable(),
  email: z.email().nullable(),
  address: localizedStringSchema,
  city: z.string().trim().max(120),
  /** ISO 3166-1 alpha-2. */
  country: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "country.invalid"),
  mapUrl: nullableUrl,
  openingHours: localizedStringSchema,
  socials: socialsSchema,
});
export type ContactSettings = z.infer<typeof contactSchema>;

/**
 * Moroccan legal identifiers printed on invoices and delivery notes.
 * ICE: 15 digits. RIB: 24 digits. The others vary by city and registry.
 */
export const billingSchema = z.object({
  legalName: z.string().trim().max(200),
  ice: digitsOrEmpty({ min: 15, max: 15 }, "billing.ice.invalid"),
  rc: z.string().trim().max(40),
  if: digitsOrEmpty({ min: 1, max: 12 }, "billing.if.invalid"),
  patente: digitsOrEmpty({ min: 1, max: 12 }, "billing.patente.invalid"),
  cnss: digitsOrEmpty({ min: 1, max: 12 }, "billing.cnss.invalid"),
  tva: z.object({
    subject: z.boolean(),
    /** Percentage, e.g. 20 for 20 %. */
    rate: z.number().min(0).max(100),
  }),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{1,12}$/, "billing.invoicePrefix.invalid"),
  invoiceFooter: localizedStringSchema,
  bankName: z.string().trim().max(120),
  rib: digitsOrEmpty({ min: 24, max: 24 }, "billing.rib.invalid"),
});
export type BillingSettings = z.infer<typeof billingSchema>;

export const NUMBERING_SYSTEMS = ["latn", "arab"] as const;
export type NumberingSystem = (typeof NUMBERING_SYSTEMS)[number];

export const localizationSchema = z.object({
  defaultLocale: localeSchema,
  enabledLocales: z.array(localeSchema).min(1),
  /** ISO 4217. */
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "currency.invalid"),
  /** IANA time zone. */
  timezone: z.string().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "timezone.invalid"),
  /** latn: 0123456789, arab: ٠١٢٣٤٥٦٧٨٩. */
  numberingSystem: z.enum(NUMBERING_SYSTEMS),
});
export type LocalizationSettings = z.infer<typeof localizationSchema>;

export const commerceSchema = z.object({
  codEnabled: z.boolean(),
  /** Order subtotal above which shipping is free, in major units. Null: no threshold. */
  freeShippingThreshold: z.number().min(0).nullable(),
  returnDays: z.number().int().min(0).max(365),
  whatsappOrderEnabled: z.boolean(),
  /** Minimum order subtotal, in major units. 0: no minimum. */
  minOrderAmount: z.number().min(0),
  /** Domain for technical emails of phone-only customers, e.g. orders.example.ma. */
  technicalEmailDomain: domainSchema,
});
export type CommerceSettings = z.infer<typeof commerceSchema>;

/** SMTP as read by the admin. The password is write-only. */
export const smtpSchema = z.object({
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  /** true: implicit TLS (465). false: STARTTLS or plain (587, 25). */
  secure: z.boolean(),
  user: z.string().trim().max(255),
  fromName: z.string().trim().max(120),
  fromEmail: z.union([z.literal(""), z.email()]),
  passwordSet: z.boolean(),
});
export type SmtpSettings = z.infer<typeof smtpSchema>;

/** SMTP as written by the admin. Omit `password` to keep it, null to clear it. */
export const smtpUpdateSchema = smtpSchema
  .omit({ passwordSet: true })
  .extend({ password: z.string().min(1).max(512).nullable() })
  .partial();
export type SmtpUpdate = z.infer<typeof smtpUpdateSchema>;

export const announcementBarSchema = z.object({
  enabled: z.boolean(),
  text: localizedStringSchema,
  href: hrefSchema.nullable(),
});

export const marketingSchema = z.object({
  gtmId: trackingId(/^GTM-[A-Z0-9]{4,12}$/),
  metaPixelId: trackingId(/^\d{10,20}$/),
  tiktokPixelId: trackingId(/^[A-Z0-9]{10,30}$/),
  ga4Id: trackingId(/^G-[A-Z0-9]{4,16}$/),
  announcementBar: announcementBarSchema,
});
export type MarketingSettings = z.infer<typeof marketingSchema>;

export const seoSchema = z.object({
  metaTitle: localizedStringSchema,
  metaDescription: localizedStringSchema,
});
export type SeoSettings = z.infer<typeof seoSchema>;

/** Icons offered for trust items (mapped to lucide icons by the apps). */
export const TRUST_ICONS = [
  "truck",
  "cash",
  "leaf",
  "shield",
  "star",
  "phone",
  "gift",
  "heart",
] as const;
export type TrustIcon = (typeof TRUST_ICONS)[number];

export const trustItemSchema = z.object({
  icon: z.enum(TRUST_ICONS),
  title: localizedStringSchema,
  text: localizedStringSchema,
});

export const statSchema = z.object({
  value: z.number().min(0).max(1_000_000_000),
  /** Shown after the number, e.g. "+" or "%". */
  suffix: z.string().trim().max(8),
  label: localizedStringSchema,
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(80),
  text: localizedStringSchema,
  rating: z.number().int().min(1).max(5),
});

/** Editorial content of the home page. Section headings are UI copy (messages). */
export const homepageSchema = z.object({
  hero: z.object({
    eyebrow: localizedStringSchema,
    title: localizedStringSchema,
    subtitle: localizedStringSchema,
    ctaLabel: localizedStringSchema,
    ctaHref: hrefSchema.nullable(),
    image: optionalMediaSchema,
  }),
  trust: z.array(trustItemSchema).max(4),
  story: z.object({
    title: localizedStringSchema,
    text: localizedStringSchema,
    image: optionalMediaSchema,
    stats: z.array(statSchema).max(4),
    ctaHref: hrefSchema.nullable(),
  }),
  testimonials: z.array(testimonialSchema).max(12),
  /** Collection shown as the gift boxes section, by handle. Null hides it. */
  giftCollectionHandle: z.string().trim().max(80).nullable(),
});
export type HomepageSettings = z.infer<typeof homepageSchema>;

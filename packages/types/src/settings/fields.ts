import { z } from "zod";

/** Digits only, or empty while the store is still being set up. */
export const digitsOrEmpty = (length?: { min: number; max: number }, message = "invalid") => {
  const pattern = length ? new RegExp(`^\\d{${length.min},${length.max}}$`) : /^\d+$/;
  return z.union([z.literal(""), z.string().trim().regex(pattern, message)]);
};

/** A URL, or null when unset. */
export const nullableUrl = z.url().nullable();

/** An absolute URL or a site-relative path such as /c/honey. */
export const hrefSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("/") || URL.canParse(value), "href.invalid");

/** Tracking ids are optional. An empty string clears them. */
export const trackingId = (pattern: RegExp) =>
  z.union([z.literal(""), z.string().trim().regex(pattern, "tracking.invalid")]);

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/, "domain.invalid");

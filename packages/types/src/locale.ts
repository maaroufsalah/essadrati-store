import { z } from "zod";
import { LOCALES, type LocalizedString } from "./locale-core";

export * from "./locale-core";

export const localeSchema = z.enum(LOCALES);

/**
 * A text value with one entry per locale. Every entry is optional so a store
 * can enable a locale before every text is translated.
 */
export const localizedStringSchema = z.partialRecord(localeSchema, z.string().trim().max(5000));

// The zod-free LocalizedString (locale-core) must stay the schema output type.
type SameType<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameLocalizedString: SameType<z.infer<typeof localizedStringSchema>, LocalizedString> = true;
void sameLocalizedString;

import { type LocalizedString, localizedStringSchema } from "@nocido/types";
import { z } from "zod";

/** A city with its zone values applied: what the storefront and the fee logic use. */
export interface ResolvedCity {
  id: string;
  slug: string;
  name: LocalizedString;
  zone: { id: string; code: string; name: LocalizedString };
  fee: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  isActive: boolean;
  rank: number;
}

export interface CityRecord {
  id: string;
  slug: string;
  name: unknown;
  fee: number | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  is_active: boolean;
  rank: number;
  zone: ZoneRecord | null;
}

export interface ZoneRecord {
  id: string;
  code: string;
  name: unknown;
  fee: number;
  delivery_days_min: number;
  delivery_days_max: number;
}

function localized(value: unknown): LocalizedString {
  const parsed = localizedStringSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function resolveCity(city: CityRecord): ResolvedCity | null {
  if (!city.zone) return null;
  return {
    id: city.id,
    slug: city.slug,
    name: localized(city.name),
    zone: { id: city.zone.id, code: city.zone.code, name: localized(city.zone.name) },
    fee: city.fee ?? city.zone.fee,
    deliveryDaysMin: city.delivery_days_min ?? city.zone.delivery_days_min,
    deliveryDaysMax: city.delivery_days_max ?? city.zone.delivery_days_max,
    isActive: city.is_active,
    rank: city.rank,
  };
}

/**
 * COD delivery fee: free when the order subtotal reaches the threshold
 * (StoreSettings.commerce.freeShippingThreshold, null = never free).
 */
export function codShippingFee(
  cityFee: number,
  subtotal: number,
  freeThreshold: number | null,
): number {
  if (freeThreshold !== null && subtotal >= freeThreshold) return 0;
  return Math.max(0, cityFee);
}

/* ---------------------------------------------------------------- CSV */

export const CSV_COLUMNS = [
  "slug",
  "name_ar",
  "name_fr",
  "name_en",
  "zone_code",
  "fee",
  "days_min",
  "days_max",
  "active",
] as const;

const optionalNumber = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null;
    const number = Number(value.replace(",", "."));
    if (!Number.isFinite(number) || number < 0) {
      ctx.addIssue({ code: "custom", message: "csv.number" });
      return z.NEVER;
    }
    return number;
  });

export const cityCsvRowSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,64}$/, "csv.slug"),
  name_ar: z.string().trim(),
  name_fr: z.string().trim(),
  name_en: z.string().trim(),
  zone_code: z.string().trim().min(1, "csv.zone"),
  fee: optionalNumber,
  days_min: optionalNumber,
  days_max: optionalNumber,
  active: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => !["0", "false", "no", "non", ""].includes(value)),
});
export type CityCsvRow = z.output<typeof cityCsvRowSchema>;

const BOM = String.fromCharCode(0xfeff);

/** RFC 4180 subset: comma or semicolon separators, quoted fields, "" escapes. */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith(BOM) ? text.slice(1) : text;
  const firstLine = source.split(/\r?\n/, 1)[0] ?? "";
  const separator =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

export interface CsvRowError {
  line: number;
  code: string;
}

/** Parses an import file. The header must contain every CSV_COLUMNS name. */
export function parseCityCsv(text: string): { rows: CityCsvRow[]; errors: CsvRowError[] } {
  const [header, ...lines] = parseCsv(text);
  if (!header) return { rows: [], errors: [{ line: 1, code: "csv.empty" }] };
  const columns = header.map((cell) => cell.trim().toLowerCase());
  const missing = CSV_COLUMNS.filter((column) => !columns.includes(column));
  if (missing.length > 0)
    return { rows: [], errors: [{ line: 1, code: `csv.missing:${missing.join(",")}` }] };

  const rows: CityCsvRow[] = [];
  const errors: CsvRowError[] = [];
  lines.forEach((cells, index) => {
    const record = Object.fromEntries(
      columns.map((column, position) => [column, cells[position] ?? ""]),
    );
    const parsed = cityCsvRowSchema.safeParse(record);
    if (parsed.success) rows.push(parsed.data);
    else errors.push({ line: index + 2, code: parsed.error.issues[0]?.message ?? "csv.invalid" });
  });
  return { rows, errors };
}

export function rowName(row: CityCsvRow): LocalizedString {
  return Object.fromEntries(
    (
      [
        ["ar", row.name_ar],
        ["fr", row.name_fr],
        ["en", row.name_en],
      ] as const
    ).filter(([, value]) => value !== ""),
  );
}

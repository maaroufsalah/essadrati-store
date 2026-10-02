/**
 * Result of the COD form server action (serializable). A placed order
 * redirects to its thank you page instead of returning a state.
 */
export type CodFormState =
  | { status: "idle" }
  | { status: "error"; fieldErrors: Partial<Record<string, CodErrorKey>>; formError?: CodErrorKey };

/** Message keys under `cod.errors` in the messages files. */
export type CodErrorKey =
  | "phone"
  | "name"
  | "email"
  | "city"
  | "quantity"
  | "disabled"
  | "belowMinimum"
  | "cityNotFound"
  | "generic";

const CODES: Record<string, CodErrorKey> = {
  "phone.invalid": "phone",
  "cod.name.invalid": "name",
  "cod.email.invalid": "email",
  "cod.city.required": "city",
  "cod.quantity.invalid": "quantity",
  "cod.disabled": "disabled",
  "cod.belowMinimum": "belowMinimum",
  "city.notFound": "cityNotFound",
};

/** Backend or schema error code -> message key. Unknown codes are generic. */
export function codErrorKey(code: string | undefined): CodErrorKey {
  return (code ? CODES[code] : undefined) ?? "generic";
}

export const IDLE: CodFormState = { status: "idle" };

/** Delivery fee shown in the form; the backend recomputes the real one. */
export function estimateShipping(
  cityFee: number | null,
  subtotal: number,
  freeThreshold: number | null,
): number | null {
  if (cityFee === null) return null;
  if (freeThreshold !== null && subtotal >= freeThreshold) return 0;
  return cityFee;
}

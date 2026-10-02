import type { CodStatus } from "@nocido/types";

/** Phone confirmation state of a COD order, stored in order.metadata.cod_status. */
export type { CodStatus };

export type CodAction = "confirm" | "cancel";

/** Allowed transitions: pending -> confirmed | cancelled, confirmed -> cancelled. */
export function nextCodStatus(current: CodStatus | null, action: CodAction): CodStatus | null {
  if (action === "confirm") return current === "pending" ? "confirmed" : null;
  return current === "pending" || current === "confirmed" ? "cancelled" : null;
}

/** "Fatima Zahra El Idrissi" -> first "Fatima", last "Zahra El Idrissi". */
export function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const [first = "", ...rest] = parts;
  return { first, last: rest.join(" ") };
}

/**
 * Phone-only customers get a technical email so Medusa can create the order:
 * +212612345678 -> 212612345678@<technicalEmailDomain>.
 */
export function codEmail(e164: string, domain: string): string {
  return `${e164.replace(/\D/g, "")}@${domain}`;
}

export const COD_EVENTS = {
  placed: "cod.order_placed",
  confirmed: "cod.order_confirmed",
  cancelled: "cod.order_cancelled",
} as const;

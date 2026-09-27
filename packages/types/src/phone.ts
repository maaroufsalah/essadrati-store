import { z } from "zod";

/**
 * Moroccan phone numbers are the customer identifier for COD orders.
 * Accepted inputs: 0612345678, 06 12 34 56 78, +212612345678,
 * 00212612345678, 212612345678, +212 (0)6 12 34 56 78.
 * Output: E.164, e.g. +212612345678.
 * Mobile numbers start with 6 or 7, landlines with 5.
 */
const MOROCCAN_NATIONAL = /^[567]\d{8}$/;

export function normalizeMoroccanPhone(input: string): string | null {
  let digits = input.replace(/[\s.\-()]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.startsWith("212")) {
    digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  } else {
    return null;
  }

  return MOROCCAN_NATIONAL.test(digits) ? `+212${digits}` : null;
}

export function isMoroccanMobile(e164: string): boolean {
  return /^\+212[67]\d{8}$/.test(e164);
}

/** Validates and normalizes to E.164. Error code for i18n: "phone.invalid". */
export const moroccanPhoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeMoroccanPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: "custom", message: "phone.invalid" });
    return z.NEVER;
  }
  return normalized;
});

/** WhatsApp link digits: E.164 without the plus sign. */
export function toWhatsAppNumber(e164: string): string {
  return e164.replace(/^\+/, "");
}

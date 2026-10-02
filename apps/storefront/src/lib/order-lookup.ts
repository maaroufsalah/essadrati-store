"use server";

import { KIT_ROUTES, PUBLISHABLE_KEY_HEADER } from "@nocido/api-client";
import { codOrderLookupSchema, isLocale } from "@nocido/types";
import { redirect } from "@/i18n/navigation";
import type { LookupErrorKey, LookupState } from "./order-lookup-state";
import { publicEnv } from "./env";
import { medusaServerUrl } from "./server-env";

const field = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** Finds an order from its number and phone, then opens its tracking page. */
export async function lookupOrder(_previous: LookupState, form: FormData): Promise<LookupState> {
  const parsed = codOrderLookupSchema.safeParse({
    phone: field(form, "phone"),
    display_id: field(form, "number").replace(/^#/, ""),
  });
  if (!parsed.success) {
    const fieldErrors: { phone?: LookupErrorKey; number?: LookupErrorKey } = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "phone") fieldErrors.phone = "phone";
      else fieldErrors.number = "number";
    }
    return { status: "error", fieldErrors };
  }

  let orderId: string | null = null;
  try {
    const response = await fetch(`${medusaServerUrl()}${KIT_ROUTES.codOrderLookup}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PUBLISHABLE_KEY_HEADER]: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404) return { status: "error", fieldErrors: {}, formError: "notFound" };
    if (response.ok) orderId = ((await response.json()) as { order_id?: string }).order_id ?? null;
  } catch (error) {
    console.error("[order] lookup failed", error);
  }
  if (!orderId) return { status: "error", fieldErrors: {}, formError: "generic" };

  const locale = field(form, "locale");
  return redirect({ href: `/order/${orderId}`, locale: isLocale(locale) ? locale : "ar" });
}

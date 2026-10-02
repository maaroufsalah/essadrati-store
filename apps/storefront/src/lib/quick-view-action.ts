"use server";

import { isLocale } from "@nocido/types";
import { getProductByHandle } from "./catalog";
import { type ProductDetail, toProductDetail } from "./product-detail";

/**
 * Product data for the quick view modal of a product card, loaded when the
 * modal opens (cached with the catalog). Null for an unknown handle.
 */
export async function loadQuickView(locale: string, handle: string): Promise<ProductDetail | null> {
  if (!isLocale(locale) || !/^[\p{L}\p{N}_-]{1,200}$/u.test(handle)) return null;
  const product = await getProductByHandle(locale, handle);
  return product ? toProductDetail(product) : null;
}

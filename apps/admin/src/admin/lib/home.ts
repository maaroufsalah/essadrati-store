import { adminFetch } from "./api";

/** Admin list endpoints of the home content modules (hero slides, category banners). */
export interface HomeItemsApi {
  /** e.g. /admin/hero-slides */
  path: string;
  /** Response keys: { slides } / { slide }. */
  listKey: string;
  itemKey: string;
}

export async function listHomeItems<T>(api: HomeItemsApi): Promise<T[]> {
  const body = await adminFetch<Record<string, T[]>>(api.path);
  return body[api.listKey] ?? [];
}

export async function saveHomeItem<T>(
  api: HomeItemsApi,
  input: unknown,
  id: string | null,
): Promise<T> {
  const body = await adminFetch<Record<string, T>>(id ? `${api.path}/${id}` : api.path, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const item = body[api.itemKey];
  if (!item) throw new Error("save.failed");
  return item;
}

export async function deleteHomeItem(api: HomeItemsApi, id: string): Promise<void> {
  await adminFetch(`${api.path}/${id}`, { method: "DELETE" });
}

/** Sends every id in the new order; returns the list as saved. */
export async function reorderHomeItems<T>(api: HomeItemsApi, ids: string[]): Promise<T[]> {
  const body = await adminFetch<Record<string, T[]>>(`${api.path}/reorder`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  return body[api.listKey] ?? [];
}

export interface LinkTarget {
  handle: string;
  label: string;
}

export interface LinkTargets {
  categories: LinkTarget[];
  products: LinkTarget[];
}

/** Categories and products offered by the link picker (handles, as in /c/... and /p/...). */
export async function fetchLinkTargets(): Promise<LinkTargets> {
  const [categories, products] = await Promise.all([
    adminFetch<{ product_categories: { handle: string; name: string }[] }>(
      "/admin/product-categories?fields=handle,name&limit=200",
    ),
    adminFetch<{ products: { handle: string; title: string }[] }>(
      "/admin/products?fields=handle,title&limit=200",
    ),
  ]);
  return {
    categories: categories.product_categories.map((c) => ({ handle: c.handle, label: c.name })),
    products: products.products.map((p) => ({ handle: p.handle, label: p.title })),
  };
}

/** Moves one entry of a list (drag and drop, up/down buttons). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
}

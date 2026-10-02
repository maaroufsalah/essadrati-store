import { KIT_ROUTES } from "@nocido/api-client";
import { adminFetch } from "./api";
import { currentLanguage } from "./i18n";

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

/**
 * Categories or products whose handle or name (any language) contains
 * `query`, labelled in the dashboard language; at most 10. With `handle`,
 * the one entry that has it (to label a saved link).
 */
export async function searchLinkTargets(
  type: "category" | "product",
  options: { query?: string; handle?: string; signal?: AbortSignal },
): Promise<LinkTarget[]> {
  const params = new URLSearchParams({ type, locale: currentLanguage() });
  if (options.query) params.set("q", options.query);
  if (options.handle) params.set("handle", options.handle);
  const body = await adminFetch<{ targets: LinkTarget[] }>(
    `${KIT_ROUTES.adminHomeLinks}?${params.toString()}`,
    { signal: options.signal },
  );
  return body.targets;
}

/** Moves one entry of a list (drag and drop, up/down buttons). */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return next;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
  return next;
}

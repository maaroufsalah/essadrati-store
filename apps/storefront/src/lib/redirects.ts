/**
 * Storefront path -> redirected path, from the backend redirect table
 * (paths without locale: /p/old -> /p/new). The locale prefix is kept;
 * paths that do not match a redirect return null. Pure, for tests.
 */
export function redirectTarget(pathname: string, map: ReadonlyMap<string, string>): string | null {
  if (map.size === 0) return null;
  const match = /^\/([a-z]{2})(\/(?:[pc]\/)?[^/]+)\/?$/.exec(pathname);
  if (!match?.[1] || !match[2]) return null;
  let path: string;
  try {
    path = decodeURIComponent(match[2]);
  } catch {
    return null;
  }
  const target = map.get(path);
  return target && target !== path ? `/${match[1]}${target}` : null;
}

/** A storefront path without locale: /p/handle, /c/handle or a CMS page /handle. */
const PATH = /^\/(?:[pc]\/)?[\p{L}\p{N}_-]{1,200}$/u;

export function isRedirectPath(value: string): boolean {
  return PATH.test(value);
}

export interface RedirectRow {
  from: string;
  to: string;
}

/**
 * Redirect rows after adding `from -> to`: chains are collapsed (a -> b and
 * b -> c become a -> c and b -> c), a path pointing back to itself is
 * dropped, and `to` loses any redirect starting from it (the page exists
 * again). Pure, for tests.
 */
export function withRedirect(
  rows: readonly RedirectRow[],
  from: string,
  to: string,
): RedirectRow[] {
  if (from === to) return rows.filter((row) => row.from !== from);
  const updated = rows
    .filter((row) => row.from !== from && row.from !== to)
    .map((row) => (row.to === from ? { ...row, to } : row))
    .filter((row) => row.from !== row.to);
  return [...updated, { from, to }];
}

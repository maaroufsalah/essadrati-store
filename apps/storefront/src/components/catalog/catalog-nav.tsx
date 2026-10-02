"use client";

import {
  type CatalogQuery,
  clearCatalogFilters,
  toCatalogSearchParams,
  toggleFacetValue,
} from "@nocido/types/client";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
} from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

interface CatalogNavValue {
  query: CatalogQuery;
  /** True while the next results load. */
  pending: boolean;
  /** Replaces the URL with `next` (no scroll reset, no history entry per click). */
  navigate: (next: CatalogQuery) => void;
  toggle: (facetId: string, value: string) => void;
  setPrice: (min: number | null, max: number | null) => void;
  clear: () => void;
  /** Search string of a query, for links (pagination, chips without JS). */
  href: (next: CatalogQuery) => string;
}

const CatalogNavContext = createContext<CatalogNavValue | null>(null);

export function useCatalogNav(): CatalogNavValue {
  const value = useContext(CatalogNavContext);
  if (!value) throw new Error("useCatalogNav outside CatalogNav");
  return value;
}

/**
 * Holds the catalog URL state for the filters, chips, sort and results.
 * Every change replaces the URL inside a transition: the server renders the
 * new page while the current one stays (with a loading state), and the
 * scroll position is kept.
 */
export function CatalogNav({
  query,
  facetIds,
  children,
}: {
  query: CatalogQuery;
  /** Facet ids in display order (URL parameter order). */
  facetIds: string[];
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // Checkboxes, chips and the price react at once; the server catches up.
  const [shown, show] = useOptimistic(query);

  const value = useMemo<CatalogNavValue>(() => {
    const facets = facetIds.map((id) => ({ id }));
    const href = (next: CatalogQuery) => {
      const search = toCatalogSearchParams(next, facets).toString();
      return search ? `${pathname}?${search}` : pathname;
    };
    const navigate = (next: CatalogQuery) =>
      startTransition(() => {
        show(next);
        router.replace(href(next), { scroll: false });
      });
    return {
      query: shown,
      pending,
      navigate,
      href,
      toggle: (facetId, item) => navigate(toggleFacetValue(shown, facetId, item)),
      setPrice: (min, max) => navigate({ ...shown, min, max, page: 1 }),
      clear: () => navigate(clearCatalogFilters(shown)),
    };
  }, [facetIds, pathname, pending, router, show, shown]);

  return <CatalogNavContext.Provider value={value}>{children}</CatalogNavContext.Provider>;
}

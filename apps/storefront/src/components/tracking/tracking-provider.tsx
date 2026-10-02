"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import { usePathname } from "@/i18n/navigation";
import { type TrackedEvent, trackedEvents } from "@/lib/analytics";
import {
  dispatchToPixels,
  hasTrackers,
  loadGa4,
  loadGtm,
  loadMetaPixel,
  loadTikTokPixel,
  pageViewToPixels,
  type TrackerIds,
} from "@/lib/trackers";

/** "server" during SSR and hydration, "none" when the visitor has not chosen yet. */
type Consent = "granted" | "denied" | "none" | "server";

const CONSENT_COOKIE = "nocido_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 180;

const listeners = new Set<() => void>();

function readConsent(): Consent {
  const match = /(?:^|;\s*)nocido_consent=(granted|denied)/.exec(document.cookie);
  return (match?.[1] as "granted" | "denied" | undefined) ?? "none";
}

function writeConsent(value: "granted" | "denied"): void {
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; samesite=lax${secure}`;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const ConsentContext = createContext<{ enabled: boolean; reopen: () => void }>({
  enabled: false,
  reopen: () => undefined,
});

/** "Manage cookies" link of the footer. */
export const useConsent = () => useContext(ConsentContext);

/**
 * Loads GTM, Meta Pixel, TikTok Pixel and GA4 only when their id is set in
 * StoreSettings and the visitor accepted cookies. Commerce events
 * (`nocido:track`) go to each pixel with their event id; events that
 * happened before consent are replayed once it is given.
 */
export function TrackingProvider({ ids, children }: { ids: TrackerIds; children: ReactNode }) {
  const t = useTranslations("consent");
  const enabled = hasTrackers(ids);
  const consent = useSyncExternalStore(subscribe, readConsent, () => "server" as const);
  const [reopened, setReopened] = useState(false);
  const open = enabled && (consent === "none" || reopened);
  const loaded = useRef(false);
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  // Base codes once consent is granted, then the events seen so far.
  useEffect(() => {
    if (consent !== "granted" || loaded.current) return;
    loaded.current = true;
    if (ids.gtmId) loadGtm(ids.gtmId);
    if (ids.ga4Id) loadGa4(ids.ga4Id);
    if (ids.metaPixelId) loadMetaPixel(ids.metaPixelId);
    if (ids.tiktokPixelId) loadTikTokPixel(ids.tiktokPixelId);
    for (const event of trackedEvents()) dispatchToPixels(event, ids);
  }, [consent, ids]);

  useEffect(() => {
    if (consent !== "granted") return;
    const onTrack = (event: Event) =>
      dispatchToPixels((event as CustomEvent<TrackedEvent>).detail, ids);
    window.addEventListener("nocido:track", onTrack);
    return () => window.removeEventListener("nocido:track", onTrack);
  }, [consent, ids]);

  // Client-side navigations; the first page view comes with the base codes.
  useEffect(() => {
    if (consent !== "granted" || pathname === firstPath.current) return;
    firstPath.current = pathname;
    pageViewToPixels(ids);
  }, [consent, ids, pathname]);

  const choose = useCallback((value: "granted" | "denied") => {
    setReopened(false);
    // Scripts already running cannot be unloaded: a reload applies the refusal.
    const reload = value === "denied" && loaded.current;
    writeConsent(value);
    if (reload) location.reload();
  }, []);

  const context = useMemo(() => ({ enabled, reopen: () => setReopened(true) }), [enabled]);

  return (
    <ConsentContext.Provider value={context}>
      {children}
      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby="consent-title"
          className="pb-safe fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
        >
          <div className="rounded-card border-border bg-card mx-auto flex max-w-3xl flex-col gap-4 border p-4 shadow-lg sm:flex-row sm:items-center sm:p-5">
            <div className="flex flex-1 flex-col gap-1">
              <h2 id="consent-title" className="text-card-fg text-sm font-semibold">
                {t("title")}
              </h2>
              <p className="text-muted-fg text-sm">{t("text")}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => choose("denied")} className="flex-1">
                {t("refuse")}
              </Button>
              <Button onClick={() => choose("granted")} className="flex-1">
                {t("accept")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConsentContext.Provider>
  );
}

/** Reopens the cookie choice; rendered only when a tracker is configured. */
export function ConsentSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("consent");
  const { enabled, reopen } = useConsent();
  if (!enabled) return null;
  return (
    <button type="button" onClick={reopen} className={className}>
      {t("manage")}
    </button>
  );
}

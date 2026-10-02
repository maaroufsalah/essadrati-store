import type { CommerceEvent, TrackedEvent } from "./analytics";

/** Tracking ids from StoreSettings.marketing; empty strings mean "not configured". */
export interface TrackerIds {
  gtmId: string;
  metaPixelId: string;
  tiktokPixelId: string;
  ga4Id: string;
}

export const hasTrackers = (ids: TrackerIds): boolean =>
  Boolean(ids.gtmId || ids.metaPixelId || ids.tiktokPixelId || ids.ga4Id);

const TIKTOK_EVENTS: Record<CommerceEvent, string> = {
  ViewContent: "ViewContent",
  AddToCart: "AddToCart",
  InitiateCheckout: "InitiateCheckout",
  Purchase: "CompletePayment",
};

const GA4_EVENTS: Record<CommerceEvent, string> = {
  ViewContent: "view_item",
  AddToCart: "add_to_cart",
  InitiateCheckout: "begin_checkout",
  Purchase: "purchase",
};

/** fbq("track", name, params, { eventID }): the event id deduplicates with the Conversions API. */
export function toMetaEvent(event: TrackedEvent) {
  return {
    name: event.event,
    params: {
      currency: event.currency,
      value: event.value,
      content_type: "product",
      content_ids: event.items.map((item) => item.id),
      contents: event.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        item_price: item.price,
      })),
      num_items: event.items.reduce((sum, item) => sum + item.quantity, 0),
      ...(event.orderId ? { order_id: event.orderId } : {}),
    },
    options: { eventID: event.eventId },
  };
}

/** ttq.track(name, params, { event_id }). */
export function toTikTokEvent(event: TrackedEvent) {
  return {
    name: TIKTOK_EVENTS[event.event],
    params: {
      currency: event.currency,
      value: event.value,
      content_type: "product",
      contents: event.items.map((item) => ({
        content_id: item.id,
        content_name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
    },
    options: { event_id: event.eventId },
  };
}

/** gtag("event", name, params): GA4 ecommerce schema. */
export function toGa4Event(event: TrackedEvent) {
  return {
    name: GA4_EVENTS[event.event],
    params: {
      currency: event.currency,
      value: event.value,
      items: event.items.map((item) => ({
        item_id: item.id,
        item_name: item.name,
        item_variant: item.variant,
        price: item.price,
        quantity: item.quantity,
      })),
      ...(event.orderId ? { transaction_id: event.orderId } : {}),
    },
  };
}

type TrackFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: TrackFn;
    ttq?: { track: TrackFn; page: TrackFn };
    gtag?: TrackFn;
  }
}

/** Ids are validated by the settings schema (digits, A-Z, dashes): safe in a snippet. */
const SAFE_ID = /^[A-Za-z0-9-]+$/;

function inlineScript(id: string, code: string): void {
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.textContent = code;
  document.head.appendChild(script);
}

/** Google Tag Manager. Events already pushed to dataLayer are processed on load. */
export function loadGtm(id: string): void {
  if (!SAFE_ID.test(id)) return;
  inlineScript(
    "nocido-gtm",
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`,
  );
}

/** GA4 through gtag.js; page views come from enhanced measurement (history changes included). */
export function loadGa4(id: string): void {
  if (!SAFE_ID.test(id)) return;
  inlineScript(
    "nocido-ga4",
    `(function(d,i){var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtag/js?id='+i;d.head.appendChild(j);})(document,'${id}');window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${id}');`,
  );
}

/** Meta Pixel base code (official snippet) and the first PageView. */
export function loadMetaPixel(id: string): void {
  if (!SAFE_ID.test(id)) return;
  inlineScript(
    "nocido-meta",
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`,
  );
}

/** TikTok Pixel base code (official snippet) and the first page view. */
export function loadTikTokPixel(id: string): void {
  if (!SAFE_ID.test(id)) return;
  inlineScript(
    "nocido-tiktok",
    `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${id}');ttq.page();}(window,document,'ttq');`,
  );
}

/** Sends one commerce event to every loaded pixel (GTM reads it from dataLayer). */
export function dispatchToPixels(event: TrackedEvent, ids: TrackerIds): void {
  if (ids.metaPixelId && window.fbq) {
    const meta = toMetaEvent(event);
    window.fbq("track", meta.name, meta.params, meta.options);
  }
  if (ids.tiktokPixelId && window.ttq) {
    const tiktok = toTikTokEvent(event);
    window.ttq.track(tiktok.name, tiktok.params, tiktok.options);
  }
  if (ids.ga4Id && window.gtag) {
    const ga4 = toGa4Event(event);
    window.gtag("event", ga4.name, ga4.params);
  }
}

/** Page view after a client-side navigation (the first one is sent by the base codes). */
export function pageViewToPixels(ids: TrackerIds): void {
  if (ids.metaPixelId) window.fbq?.("track", "PageView");
  if (ids.tiktokPixelId) window.ttq?.page();
}

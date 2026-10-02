/**
 * Storefront commerce events. Components call `track`; the tracking layer
 * (GTM, Meta, TikTok, GA4) subscribes to the "nocido:track" DOM event and to
 * window.dataLayer. Every event carries an id so pixels and server events
 * can be deduplicated.
 */
export type CommerceEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase";

export interface TrackItem {
  id: string;
  name: string;
  variant?: string;
  price: number;
  quantity: number;
}

export interface TrackPayload {
  currency: string;
  value: number;
  items: TrackItem[];
  orderId?: string;
}

export interface TrackedEvent extends TrackPayload {
  event: CommerceEvent;
  eventId: string;
}

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const recent = new Map<string, number>();
/** Events of this page view, replayed to the pixels when consent arrives later. */
const history: TrackedEvent[] = [];

export function trackedEvents(): readonly TrackedEvent[] {
  return history;
}

/** Same event with the same content within 2 s is ignored (double clicks, re-renders). */
function isDuplicate(event: CommerceEvent, payload: TrackPayload): boolean {
  const signature = `${event}:${payload.orderId ?? ""}:${payload.items.map((item) => `${item.id}x${item.quantity}`).join(",")}`;
  const now = Date.now();
  const last = recent.get(signature);
  recent.set(signature, now);
  return last !== undefined && now - last < 2000;
}

export function track(event: CommerceEvent, payload: TrackPayload, eventId?: string): void {
  if (typeof window === "undefined" || isDuplicate(event, payload)) return;
  const detail: TrackedEvent = { event, eventId: eventId ?? crypto.randomUUID(), ...payload };
  history.push(detail);
  if (history.length > 20) history.shift();
  window.dataLayer ??= [];
  window.dataLayer.push({ ...detail, event: `nocido_${event}`, commerceEvent: event });
  window.dispatchEvent(new CustomEvent<TrackedEvent>("nocido:track", { detail }));
}

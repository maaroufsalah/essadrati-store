import { describe, expect, it } from "vitest";
import type { TrackedEvent } from "./analytics";
import { hasTrackers, toGa4Event, toMetaEvent, toTikTokEvent } from "./trackers";

const purchase: TrackedEvent = {
  event: "Purchase",
  eventId: "order_01",
  orderId: "order_01",
  currency: "MAD",
  value: 630,
  items: [
    { id: "variant_a", name: "Miel", variant: "500g", price: 300, quantity: 2 },
    { id: "variant_b", name: "Amlou", price: 30, quantity: 1 },
  ],
};

describe("tracker mapping", () => {
  it("detects configured trackers", () => {
    const none = { gtmId: "", metaPixelId: "", tiktokPixelId: "", ga4Id: "" };
    expect(hasTrackers(none)).toBe(false);
    expect(hasTrackers({ ...none, ga4Id: "G-ABC123" })).toBe(true);
  });

  it("maps to Meta with the event id for deduplication", () => {
    const meta = toMetaEvent(purchase);
    expect(meta.name).toBe("Purchase");
    expect(meta.options).toEqual({ eventID: "order_01" });
    expect(meta.params).toMatchObject({
      currency: "MAD",
      value: 630,
      content_ids: ["variant_a", "variant_b"],
      num_items: 3,
      order_id: "order_01",
    });
  });

  it("maps Purchase to TikTok CompletePayment", () => {
    const tiktok = toTikTokEvent(purchase);
    expect(tiktok.name).toBe("CompletePayment");
    expect(tiktok.options).toEqual({ event_id: "order_01" });
    expect(tiktok.params.contents[0]).toEqual({
      content_id: "variant_a",
      content_name: "Miel",
      quantity: 2,
      price: 300,
    });
  });

  it("maps to the GA4 ecommerce schema", () => {
    const ga4 = toGa4Event(purchase);
    expect(ga4.name).toBe("purchase");
    expect(ga4.params).toMatchObject({ transaction_id: "order_01", value: 630 });
    expect(toGa4Event({ ...purchase, event: "AddToCart", orderId: undefined }).name).toBe(
      "add_to_cart",
    );
  });
});

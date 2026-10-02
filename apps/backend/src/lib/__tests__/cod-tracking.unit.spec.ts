import { describe, expect, it } from "vitest";
import { toCodTracking } from "../cod-tracking";

const base = {
  id: "order_01",
  display_id: 7,
  created_at: "2026-10-02T10:00:00.000Z",
  canceled_at: null,
  currency_code: "mad",
  item_total: "600",
  shipping_total: 0,
  total: 600,
  metadata: {
    cod: true,
    cod_status: "confirmed",
    cod_status_at: "2026-10-02T11:00:00.000Z",
    customer_name: "Fatima Zahra",
    customer_phone: "+212612345678",
    city_id: "city_1",
  },
  items: [
    {
      id: "item_1",
      variant_id: "variant_1",
      product_handle: "miel",
      title: "500g",
      product_title: "Miel",
      variant_title: "500g",
      thumbnail: null,
      quantity: 2,
      unit_price: 300,
      total: 600,
    },
  ],
  fulfillments: [
    { shipped_at: "2026-10-03T09:00:00.000Z", delivered_at: null, canceled_at: null },
    {
      shipped_at: "2026-10-02T15:00:00.000Z",
      delivered_at: null,
      canceled_at: "2026-10-02T16:00:00Z",
    },
  ],
};

describe("public COD tracking", () => {
  it("ignores orders that are not COD", () => {
    expect(toCodTracking({ ...base, metadata: {} })).toBeNull();
  });

  it("exposes the first name and a masked phone only", () => {
    const tracking = toCodTracking(base);
    expect(tracking?.first_name).toBe("Fatima");
    expect(tracking?.phone_masked).toBe("+212 6•• ••• •78");
    expect(JSON.stringify(tracking)).not.toContain("612345678");
    expect(JSON.stringify(tracking)).not.toContain("Zahra");
  });

  it("uses active fulfillments for the shipped step", () => {
    const tracking = toCodTracking(base);
    expect(tracking?.state).toBe("shipped");
    expect(tracking?.timeline.find((entry) => entry.step === "shipped")?.at).toBe(
      "2026-10-03T09:00:00.000Z",
    );
  });

  it("normalizes amounts and item titles", () => {
    const tracking = toCodTracking(base);
    expect(tracking?.item_total).toBe(600);
    expect(tracking?.items[0]).toMatchObject({ title: "Miel", quantity: 2, total: 600 });
  });
});

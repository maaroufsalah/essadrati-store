import { describe, expect, it } from "vitest";
import { codOrderLookupSchema, codTracking, maskPhone } from "../cod";

const base = {
  createdAt: "2026-10-01T10:00:00.000Z",
  codStatus: "pending" as const,
  codStatusAt: "2026-10-01T10:00:00.000Z",
  canceledAt: null,
  shippedAt: null,
  deliveredAt: null,
};

describe("codTracking", () => {
  it("starts at placed", () => {
    const { state, timeline } = codTracking(base);
    expect(state).toBe("placed");
    expect(timeline.map((entry) => [entry.step, entry.done])).toEqual([
      ["placed", true],
      ["confirmed", false],
      ["shipped", false],
      ["delivered", false],
    ]);
  });

  it("follows confirmation then delivery", () => {
    const confirmed = {
      ...base,
      codStatus: "confirmed" as const,
      codStatusAt: "2026-10-01T11:00:00Z",
    };
    expect(codTracking(confirmed).state).toBe("confirmed");
    const delivered = {
      ...confirmed,
      shippedAt: "2026-10-02T09:00:00Z",
      deliveredAt: "2026-10-03T09:00:00Z",
    };
    const { state, timeline } = codTracking(delivered);
    expect(state).toBe("delivered");
    expect(timeline.every((entry) => entry.done)).toBe(true);
  });

  it("treats a shipment without phone confirmation as confirmed", () => {
    const { state, timeline } = codTracking({ ...base, shippedAt: "2026-10-02T09:00:00Z" });
    expect(state).toBe("shipped");
    expect(timeline.find((entry) => entry.step === "confirmed")).toMatchObject({
      done: true,
      at: null,
    });
  });

  it("ends the timeline on cancellation", () => {
    const { state, timeline } = codTracking({
      ...base,
      codStatus: "cancelled",
      codStatusAt: "2026-10-01T12:00:00Z",
    });
    expect(state).toBe("cancelled");
    expect(timeline.map((entry) => entry.step)).toEqual(["placed", "cancelled"]);
    expect(timeline.at(-1)?.at).toBe("2026-10-01T12:00:00Z");
  });
});

describe("order lookup", () => {
  it("normalizes the phone and the number", () => {
    expect(codOrderLookupSchema.parse({ phone: "06 12 34 56 78", display_id: "42" })).toEqual({
      phone: "+212612345678",
      display_id: 42,
    });
  });

  it("rejects a bad number", () => {
    expect(codOrderLookupSchema.safeParse({ phone: "0612345678", display_id: "abc" }).success).toBe(
      false,
    );
  });

  it("masks the phone", () => {
    expect(maskPhone("+212612345678")).toBe("+212 6•• ••• •78");
  });
});

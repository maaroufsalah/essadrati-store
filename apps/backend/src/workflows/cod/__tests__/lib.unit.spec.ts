import { describe, expect, it } from "vitest";
import { codEmail, nextCodStatus, splitName } from "../lib";

describe("COD status transitions", () => {
  it("confirms only pending orders", () => {
    expect(nextCodStatus("pending", "confirm")).toBe("confirmed");
    expect(nextCodStatus("confirmed", "confirm")).toBeNull();
    expect(nextCodStatus("cancelled", "confirm")).toBeNull();
    expect(nextCodStatus(null, "confirm")).toBeNull();
  });

  it("cancels pending and confirmed orders", () => {
    expect(nextCodStatus("pending", "cancel")).toBe("cancelled");
    expect(nextCodStatus("confirmed", "cancel")).toBe("cancelled");
    expect(nextCodStatus("cancelled", "cancel")).toBeNull();
  });
});

describe("COD customer helpers", () => {
  it("splits the full name on the first space", () => {
    expect(splitName("  Fatima   Zahra El Idrissi ")).toEqual({
      first: "Fatima",
      last: "Zahra El Idrissi",
    });
    expect(splitName("فاطمة")).toEqual({ first: "فاطمة", last: "" });
  });

  it("builds the technical email from the phone", () => {
    expect(codEmail("+212612345678", "orders.example.test")).toBe(
      "212612345678@orders.example.test",
    );
  });
});

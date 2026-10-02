import { describe, expect, it } from "vitest";
import { codErrorKey, estimateShipping } from "./cod-form";

describe("COD form helpers", () => {
  it("maps backend and schema codes to message keys", () => {
    expect(codErrorKey("phone.invalid")).toBe("phone");
    expect(codErrorKey("cod.belowMinimum")).toBe("belowMinimum");
    expect(codErrorKey("Something unexpected")).toBe("generic");
    expect(codErrorKey(undefined)).toBe("generic");
  });

  it("estimates the delivery fee like the backend", () => {
    expect(estimateShipping(null, 300, 500)).toBeNull();
    expect(estimateShipping(30, 300, 500)).toBe(30);
    expect(estimateShipping(30, 600, 500)).toBe(0);
    expect(estimateShipping(30, 600, null)).toBe(30);
  });
});

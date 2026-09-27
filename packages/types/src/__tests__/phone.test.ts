import { describe, expect, it } from "vitest";
import {
  isMoroccanMobile,
  moroccanPhoneSchema,
  normalizeMoroccanPhone,
  toWhatsAppNumber,
} from "../phone";

describe("normalizeMoroccanPhone", () => {
  it.each([
    ["0612345678", "+212612345678"],
    ["06 12 34 56 78", "+212612345678"],
    ["06-12-34-56-78", "+212612345678"],
    ["0712345678", "+212712345678"],
    ["0522123456", "+212522123456"],
    ["+212612345678", "+212612345678"],
    ["+212 6 12 34 56 78", "+212612345678"],
    ["+212 (0)6 12 34 56 78", "+212612345678"],
    ["00212612345678", "+212612345678"],
    ["212612345678", "+212612345678"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMoroccanPhone(input)).toBe(expected);
  });

  it.each([
    ["", "empty"],
    ["612345678", "missing leading zero"],
    ["061234567", "too short"],
    ["06123456789", "too long"],
    ["0812345678", "unknown prefix"],
    ["+33612345678", "foreign number"],
    ["06123x5678", "letters"],
  ])("rejects %s (%s)", (input) => {
    expect(normalizeMoroccanPhone(input)).toBeNull();
  });
});

describe("moroccanPhoneSchema", () => {
  it("outputs E.164", () => {
    expect(moroccanPhoneSchema.parse("06 12 34 56 78")).toBe("+212612345678");
  });

  it("uses an i18n key as error message", () => {
    const result = moroccanPhoneSchema.safeParse("123");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("phone.invalid");
  });
});

describe("helpers", () => {
  it("detects mobile numbers", () => {
    expect(isMoroccanMobile("+212612345678")).toBe(true);
    expect(isMoroccanMobile("+212522123456")).toBe(false);
  });

  it("formats WhatsApp numbers without plus", () => {
    expect(toWhatsAppNumber("+212612345678")).toBe("212612345678");
  });
});

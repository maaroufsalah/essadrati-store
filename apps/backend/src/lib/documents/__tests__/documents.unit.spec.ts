import { describe, expect, it } from "vitest";
import {
  buildDeliveryNoteHtml,
  buildInvoiceHtml,
  type DocumentOrder,
  type DocumentSeller,
  invoiceNumber,
  taxBreakdown,
} from "../templates";
import { amountToFrenchWords, integerToFrenchWords } from "../words";

describe("amounts in French words", () => {
  it.each([
    [0, "zéro"],
    [1, "un"],
    [17, "dix-sept"],
    [21, "vingt et un"],
    [71, "soixante et onze"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [99, "quatre-vingt-dix-neuf"],
    [100, "cent"],
    [200, "deux cents"],
    [330, "trois cent trente"],
    [1000, "mille"],
    [1980, "mille neuf cent quatre-vingts"],
    [80_000, "quatre-vingt mille"],
    [200_500, "deux cent mille cinq cents"],
    [2_000_000, "deux millions"],
  ])("%i -> %s", (value, words) => {
    expect(integerToFrenchWords(value)).toBe(words);
  });

  it("writes dirhams and centimes", () => {
    expect(amountToFrenchWords(330.5, "mad")).toBe(
      "trois cent trente dirhams et cinquante centimes",
    );
    expect(amountToFrenchWords(1, "MAD")).toBe("un dirham");
  });
});

const order: DocumentOrder = {
  displayId: 42,
  createdAt: "2026-10-02T21:30:00.000Z",
  currency: "mad",
  customerName: "فاطمة الزهراء <b>",
  customerPhone: "+212612345678",
  address: "حي الرياض",
  cityName: "Rabat",
  note: null,
  items: [{ title: "عسل الفرنان", variant: "500g", quantity: 2, unitPrice: 300, total: 600 }],
  itemTotal: 600,
  shippingTotal: 30,
  total: 630,
};

const seller: DocumentSeller = {
  storeName: "Boutique",
  legalName: "Boutique SARL",
  logoUrl: null,
  address: "1 rue Test",
  city: "Casablanca",
  phone: "+212522000000",
  email: "contact@example.test",
  ice: "001234567000089",
  rc: "12345",
  if: "1234567",
  patente: "",
  cnss: "",
  tva: { subject: true, rate: 20 },
  invoicePrefix: "FA",
  footer: "Merci",
  timezone: "Africa/Casablanca",
  colors: {
    fg: "#111111",
    muted: "#555555",
    border: "#dddddd",
    primary: "#222222",
    primaryFg: "#ffffff",
    surface: "#f5f5f5",
  },
};

describe("documents", () => {
  it("numbers invoices by year and order", () => {
    expect(invoiceNumber(order, seller)).toBe("FA-2026-000042");
  });

  it("splits TVA out of tax inclusive totals", () => {
    expect(taxBreakdown(630, 20)).toEqual({ ht: 525, tva: 105 });
  });

  it("prints the legal mentions, the TVA and the amount in words", () => {
    const html = buildInvoiceHtml(order, seller);
    expect(html).toContain("FA-2026-000042");
    expect(html).toContain("ICE 001234567000089");
    expect(html).toContain("TVA 20 %");
    expect(html).toContain("six cent trente dirhams");
    expect(html).not.toContain("Patente");
  });

  it("isolates Arabic text and escapes it", () => {
    const html = buildInvoiceHtml(order, seller);
    expect(html).toContain('<bdi dir="auto">فاطمة الزهراء &lt;b&gt;</bdi>');
    expect(html).toContain('<bdi dir="auto">عسل الفرنان</bdi>');
  });

  it("states that TVA does not apply when the seller is not subject", () => {
    const html = buildInvoiceHtml(order, { ...seller, tva: { subject: false, rate: 0 } });
    expect(html).toContain("TVA non applicable");
    expect(html).not.toContain("Total HT");
  });

  it("shows the amount to collect on the delivery note", () => {
    const html = buildDeliveryNoteHtml(order, seller);
    expect(html).toContain("BL-000042");
    expect(html).toContain("Montant à encaisser");
    expect(html).not.toContain("PU TTC");
  });
});

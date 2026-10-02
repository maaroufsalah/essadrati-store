import { describe, expect, it } from "vitest";
import { codEmail, nextCodStatus, splitName } from "../../../workflows/cod/lib";
import { codShippingFee, parseCityCsv, parseCsv, resolveCity, rowName } from "../lib/cities";

const zone = {
  id: "codz_1",
  code: "grandes-villes",
  name: { fr: "Grandes villes" },
  fee: 35,
  delivery_days_min: 2,
  delivery_days_max: 3,
};

describe("resolveCity", () => {
  it("falls back to the zone fee and delay", () => {
    const city = resolveCity({
      id: "codc_1",
      slug: "fes",
      name: { ar: "فاس", fr: "Fès" },
      fee: null,
      delivery_days_min: null,
      delivery_days_max: 4,
      is_active: true,
      rank: 1,
      zone,
    });
    expect(city).toMatchObject({ fee: 35, deliveryDaysMin: 2, deliveryDaysMax: 4 });
  });

  it("keeps a city fee override, including zero", () => {
    const city = resolveCity({
      id: "codc_2",
      slug: "rabat",
      name: {},
      fee: 0,
      delivery_days_min: null,
      delivery_days_max: null,
      is_active: true,
      rank: 0,
      zone,
    });
    expect(city?.fee).toBe(0);
  });
});

describe("codShippingFee", () => {
  it("is free from the threshold", () => {
    expect(codShippingFee(35, 499, 500)).toBe(35);
    expect(codShippingFee(35, 500, 500)).toBe(0);
  });

  it("is never free without a threshold", () => {
    expect(codShippingFee(35, 10_000, null)).toBe(35);
  });
});

describe("CSV import", () => {
  it("parses quotes, escaped quotes and semicolons", () => {
    expect(parseCsv('a;b\n"x;y";"say ""hi"""\n')).toEqual([
      ["a", "b"],
      ["x;y", 'say "hi"'],
    ]);
  });

  it("validates rows and reports bad lines", () => {
    const csv = [
      "slug,name_ar,name_fr,name_en,zone_code,fee,days_min,days_max,active",
      "Fes,فاس,Fès,Fez,grandes-villes,40,2,3,1",
      "bad slug!,,,,grandes-villes,,,,1",
      "ifrane,إفران,Ifrane,,autres-villes,,,,0",
    ].join("\r\n");
    const { rows, errors } = parseCityCsv(csv);
    expect(rows.map((row) => row.slug)).toEqual(["fes", "ifrane"]);
    expect(rows[0]).toMatchObject({ fee: 40, days_min: 2, active: true });
    expect(rows[1]).toMatchObject({ fee: null, active: false });
    const [, ifrane] = rows;
    if (!ifrane) throw new Error("missing row");
    expect(rowName(ifrane)).toEqual({ ar: "إفران", fr: "Ifrane" });
    expect(errors).toEqual([{ line: 3, code: "csv.slug" }]);
  });

  it("refuses a file without the required columns", () => {
    const { rows, errors } = parseCityCsv("slug,name_fr\nfes,Fès");
    expect(rows).toEqual([]);
    expect(errors[0]?.code).toMatch(/^csv\.missing:/);
  });
});

describe("COD order helpers", () => {
  it("allows only the documented status transitions", () => {
    expect(nextCodStatus("pending", "confirm")).toBe("confirmed");
    expect(nextCodStatus("confirmed", "confirm")).toBeNull();
    expect(nextCodStatus("confirmed", "cancel")).toBe("cancelled");
    expect(nextCodStatus("cancelled", "cancel")).toBeNull();
    expect(nextCodStatus(null, "confirm")).toBeNull();
  });

  it("splits names and builds the technical email", () => {
    expect(splitName("  Fatima Zahra  El Idrissi ")).toEqual({
      first: "Fatima",
      last: "Zahra El Idrissi",
    });
    expect(splitName("Youssef")).toEqual({ first: "Youssef", last: "" });
    expect(codEmail("+212612345678", "orders.example.ma")).toBe("212612345678@orders.example.ma");
  });
});

import { describe, expect, it } from "vitest";
import { calculateOffer, computeBracketTax, LOCATIONS, TAX_YEAR } from "./tax";
import taxData from "./tax-data.json";

const FED = taxData.federal.brackets;

function offer(overrides: Partial<Parameters<typeof calculateOffer>[0]> = {}) {
  return calculateOffer({
    hourlyRate: 40,
    hoursPerWeek: 40,
    durationMonths: 6,
    locationId: "boston",
    monthlyRent: 1600,
    ...overrides,
  });
}

describe("computeBracketTax", () => {
  it("is zero for zero, negative, and NaN income", () => {
    expect(computeBracketTax(FED, 0)).toBe(0);
    expect(computeBracketTax(FED, -5000)).toBe(0);
    expect(computeBracketTax(FED, NaN)).toBe(0);
  });

  it("taxes income exactly at a bracket boundary at the lower rate", () => {
    // 2026 first federal bracket: 10% up to $12,400
    expect(computeBracketTax(FED, 12400)).toBeCloseTo(1240, 2);
  });

  it("applies marginal rates across brackets", () => {
    // $50,400 taxable: 10% * 12,400 + 12% * 38,000 = 1,240 + 4,560
    expect(computeBracketTax(FED, 50400)).toBeCloseTo(5800, 2);
    // one dollar into the 22% bracket adds 22 cents
    expect(computeBracketTax(FED, 50401)).toBeCloseTo(5800.22, 2);
  });

  it("handles flat taxes (single unbounded bracket)", () => {
    expect(computeBracketTax([{ upTo: null, rate: 0.05 }], 78800)).toBeCloseTo(3940, 2);
  });

  it("handles no-tax states (empty bracket table)", () => {
    expect(computeBracketTax([], 100000)).toBe(0);
  });
});

describe("no-state-tax locations", () => {
  it.each(["seattle", "austin"])("%s has zero state and city tax", (locationId) => {
    const result = offer({ locationId });
    expect(result.monthlyWithholding.state).toBe(0);
    expect(result.monthlyWithholding.city).toBe(0);
    // ...but federal and FICA still apply
    expect(result.monthlyWithholding.federal).toBeGreaterThan(0);
    expect(result.monthlyWithholding.fica).toBeGreaterThan(0);
  });
});

describe("flat-tax states", () => {
  it("Massachusetts withholds a flat 5% of annualized income after the exemption", () => {
    const result = offer({ locationId: "boston" });
    // annualized 83,200 - 4,400 exemption = 78,800 * 5% = 3,940 / 12
    expect(result.monthlyWithholding.state).toBeCloseTo(3940 / 12, 2);
  });

  it("Chicago is flat Illinois tax with NO city line item", () => {
    const result = offer({ locationId: "chicago" });
    // annualized 83,200 - 2,925 exemption = 80,275 * 4.95% = 3,973.6125 / 12
    expect(result.monthlyWithholding.state).toBeCloseTo(3973.6125 / 12, 2);
    expect(result.monthlyWithholding.city).toBe(0);
  });
});

describe("New York City", () => {
  it("has a city tax that is a distinct line item from state tax", () => {
    const result = offer({ locationId: "nyc" });
    expect(result.monthlyWithholding.city).toBeGreaterThan(0);
    expect(result.monthlyWithholding.state).toBeGreaterThan(0);
    expect(result.monthlyWithholding.city).not.toBeCloseTo(result.monthlyWithholding.state, 2);
  });
});

describe("Boston fixture: $40/hr, 40 h/wk, 6 months, $1,600 rent", () => {
  // Hand-computed:
  //   monthlyGross = 40 * 40 * 52 / 12 = 6,933.33
  //   annualized   = 83,200
  //   federal withholding: taxable 83,200 - 16,100 = 67,100
  //     -> 1,240 + 4,560 + 22% * 16,700 = 9,474 / yr -> 789.50 / mo
  //   MA: (83,200 - 4,400) * 5% = 3,940 / yr -> 328.33 / mo
  //   FICA: 6,933.33 * 7.65% = 530.40 / mo
  //   take-home = 6,933.33 - 1,648.23 = 5,285.10; after rent = 3,685.10
  //   true liability on 41,600 actual gross:
  //     federal: taxable 25,500 -> 1,240 + 12% * 13,100 = 2,812
  //     MA: 37,200 * 5% = 1,860 -> true income tax = 4,672
  //   withheld income tax = (789.50 + 328.33) * 6 = 6,707
  //   refund = 6,707 - 4,672 = 2,035
  //   totalNet = 41,600 - (4,672 + 3,182.40 FICA) - 9,600 rent = 24,145.60
  const result = offer();

  it("computes monthly gross", () => {
    expect(result.monthlyGross).toBeCloseTo(6933.33, 1);
  });

  it("computes withholding line items", () => {
    expect(result.monthlyWithholding.federal).toBeCloseTo(789.5, 1);
    expect(result.monthlyWithholding.state).toBeCloseTo(328.33, 1);
    expect(result.monthlyWithholding.city).toBe(0);
    expect(result.monthlyWithholding.fica).toBeCloseTo(530.4, 1);
  });

  it("computes take-home and after-rent", () => {
    expect(result.monthlyTakeHome).toBeCloseTo(5285.1, 1);
    expect(result.monthlyAfterRent).toBeCloseTo(3685.1, 1);
  });

  it("computes the refund (withheld minus true liability)", () => {
    expect(result.estimatedRefund).toBeCloseTo(2035, 0);
  });

  it("computes total net over the co-op using TRUE liability", () => {
    expect(result.totalNet).toBeCloseTo(24145.6, 0);
  });
});

describe("NYC fixture: $45/hr, 40 h/wk, 6 months, $2,200 rent", () => {
  // Hand-computed:
  //   monthlyGross = 7,800; annualized = 93,600
  //   federal: taxable 77,500 -> 1,240 + 4,560 + 22% * 27,100 = 11,762 / yr
  //   NY: taxable 85,600 -> 331.50 + 140.80 + 113.30 + 3,604.50 + 5.9% * 4,950 = 4,482.15 / yr
  //   NYC: on 85,600 -> 369.36 + 489.06 + 954.75 + 3.876% * 35,600 = 3,193.026 / yr
  //   FICA: 596.70 / mo
  //   true liability on 46,800 actual gross:
  //     federal: taxable 30,700 -> 3,436
  //     NY: taxable 38,800 -> 1,930.20
  //     NYC: on 38,800 -> 1,385.44
  //   withheld income tax = (11,762 + 4,482.15 + 3,193.026) / 12 * 6 = 9,718.59
  //   refund = 9,718.59 - 6,751.64 = 2,966.95
  const result = offer({ hourlyRate: 45, locationId: "nyc", monthlyRent: 2200 });

  it("computes withholding line items including the distinct city tax", () => {
    expect(result.monthlyWithholding.federal).toBeCloseTo(11762 / 12, 1);
    expect(result.monthlyWithholding.state).toBeCloseTo(4482.15 / 12, 1);
    expect(result.monthlyWithholding.city).toBeCloseTo(3193.03 / 12, 1);
  });

  it("computes the refund", () => {
    expect(result.estimatedRefund).toBeCloseTo(2966.95, 0);
  });
});

describe("the core insight: withholding overshoots partial-year liability", () => {
  it("a 6-month co-op is over-withheld and gets a refund", () => {
    const result = offer();
    const withheldIncomeTax =
      (result.monthlyWithholding.federal +
        result.monthlyWithholding.state +
        result.monthlyWithholding.city) *
      6;
    const trueIncomeTax = result.trueTaxTotal - result.totalGross * taxData.fica.rate;
    expect(withheldIncomeTax).toBeGreaterThan(trueIncomeTax);
    expect(result.estimatedRefund).toBeGreaterThan(0);
  });

  it("a 12-month position is withheld exactly right: refund is ~0", () => {
    const result = offer({ durationMonths: 12 });
    expect(result.estimatedRefund).toBeCloseTo(0, 6);
  });

  it("longer co-ops shrink the refund relative to income", () => {
    const shortRefund = offer({ durationMonths: 4 }).estimatedRefund;
    const longRefund = offer({ durationMonths: 8 }).estimatedRefund;
    const shortGross = offer({ durationMonths: 4 }).totalGross;
    const longGross = offer({ durationMonths: 8 }).totalGross;
    expect(shortRefund / shortGross).toBeGreaterThan(longRefund / longGross);
  });
});

describe("edge cases", () => {
  it("all-zero inputs produce all-zero outputs with no NaN", () => {
    const result = offer({ hourlyRate: 0, hoursPerWeek: 0, durationMonths: 0, monthlyRent: 0 });
    expect(result.monthlyGross).toBe(0);
    expect(result.monthlyTakeHome).toBe(0);
    expect(result.monthlyAfterRent).toBe(0);
    expect(result.totalNet).toBe(0);
    expect(result.estimatedRefund).toBe(0);
    for (const value of Object.values(result.monthlyWithholding)) {
      expect(value).toBe(0);
    }
  });

  it("negative and NaN inputs are clamped to zero", () => {
    const result = offer({ hourlyRate: -10, hoursPerWeek: NaN, monthlyRent: -500 });
    expect(result.monthlyGross).toBe(0);
    expect(result.monthlyAfterRent).toBe(0);
  });

  it("income below the deduction owes no income tax but still owes FICA", () => {
    // $10/hr * 8 h/wk -> annualized 4,160, under both the federal standard
    // deduction (16,100) and the MA personal exemption (4,400)
    const result = offer({ hourlyRate: 10, hoursPerWeek: 8 });
    expect(result.monthlyWithholding.federal).toBe(0);
    expect(result.monthlyWithholding.state).toBe(0);
    expect(result.monthlyWithholding.fica).toBeGreaterThan(0);
  });

  it("throws on an unknown location", () => {
    expect(() => offer({ locationId: "atlantis" })).toThrow(/Unknown location/);
  });
});

describe("data sanity", () => {
  it("exposes the tax year and all eight locations", () => {
    expect(TAX_YEAR).toBe(2026);
    expect(LOCATIONS).toHaveLength(8);
    expect(LOCATIONS.filter((l) => l.cityTax)).toHaveLength(1);
    expect(LOCATIONS.find((l) => l.cityTax)?.id).toBe("nyc");
  });
});

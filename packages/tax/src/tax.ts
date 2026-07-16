/**
 * Pure tax calculation module. No dependencies beyond tax-data.json.
 *
 * The core idea, computed as two passes over the same bracket tables:
 *
 * 1. Withholding pass — payroll assumes your pay rate continues all year,
 *    so it annualizes your monthly gross and withholds at that rate.
 * 2. Liability pass — you only actually earn `durationMonths` of income,
 *    so your true tax is computed on that smaller amount.
 *
 * The difference between what gets withheld and what is truly owed is the
 * refund the student can expect back at filing time.
 */
import taxData from "./tax-data.json";

export interface Bracket {
  /** Upper bound of the bracket in dollars of taxable income; null = no cap. */
  upTo: number | null;
  rate: number;
}

export interface LocationInfo {
  id: string;
  label: string;
  state: string;
  cityTax?: string;
}

export interface OfferInputs {
  hourlyRate: number;
  hoursPerWeek: number;
  durationMonths: number;
  locationId: string;
  /** Monthly rent; pass 0 for "living at home / subsidized housing". */
  monthlyRent: number;
}

/** Monthly tax amounts, as withheld from each paycheck. */
export interface TaxBreakdown {
  federal: number;
  state: number;
  /** Only non-zero for locations with a local income tax (NYC). */
  city: number;
  fica: number;
  total: number;
}

export interface OfferResult {
  location: LocationInfo;
  taxYear: number;
  /** Gross pay per month (rate x hours x 52 / 12). */
  monthlyGross: number;
  /** Monthly withholding, per tax, as payroll would take it. */
  monthlyWithholding: TaxBreakdown;
  /** What actually hits the bank account each month. */
  monthlyTakeHome: number;
  /** The headline: monthly take-home minus rent. */
  monthlyAfterRent: number;
  /** Gross earned over the whole co-op. */
  totalGross: number;
  /** True tax liability over the whole co-op (income annualized only over months actually worked). */
  trueTaxTotal: number;
  /** Total kept over the whole co-op: gross - true tax - rent. Includes the eventual refund. */
  totalNet: number;
  /** Expected refund at filing time: withheld income tax minus true income tax liability. */
  estimatedRefund: number;
}

interface StateData {
  name: string;
  deduction: number;
  brackets: Bracket[];
}

const data = taxData as {
  taxYear: number;
  federal: { standardDeduction: number; brackets: Bracket[] };
  fica: { rate: number };
  states: Record<string, StateData>;
  cityTaxes: Record<string, { name: string; brackets: Bracket[] }>;
  locations: LocationInfo[];
};

export const TAX_YEAR = data.taxYear;
export const LOCATIONS: LocationInfo[] = data.locations;

/** Whether a state taxes wage income at all (false for WA and TX). */
export function stateHasIncomeTax(stateCode: string): boolean {
  return (data.states[stateCode]?.brackets.length ?? 0) > 0;
}

export function getLocation(locationId: string): LocationInfo {
  const location = data.locations.find((l) => l.id === locationId);
  if (!location) {
    throw new Error(`Unknown location: ${locationId}`);
  }
  return location;
}

/** Progressive (marginal) tax over a bracket table. Handles flat taxes
 *  (single unbounded bracket) and no-tax states (empty table) the same way. */
export function computeBracketTax(brackets: Bracket[], taxableIncome: number): number {
  const income = clamp(taxableIncome);
  let tax = 0;
  let lowerBound = 0;
  for (const bracket of brackets) {
    const upper = bracket.upTo ?? Infinity;
    if (income <= lowerBound) break;
    tax += (Math.min(income, upper) - lowerBound) * bracket.rate;
    lowerBound = upper;
  }
  return tax;
}

function clamp(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Annual federal + state + city income tax for a given annual gross income. */
function annualIncomeTaxes(annualGross: number, location: LocationInfo) {
  const state = data.states[location.state];
  const federalTaxable = Math.max(0, annualGross - data.federal.standardDeduction);
  const stateTaxable = Math.max(0, annualGross - state.deduction);

  const federal = computeBracketTax(data.federal.brackets, federalTaxable);
  const stateTax = computeBracketTax(state.brackets, stateTaxable);
  // NYC taxes city taxable income, which follows state taxable income.
  const city = location.cityTax
    ? computeBracketTax(data.cityTaxes[location.cityTax].brackets, stateTaxable)
    : 0;

  return { federal, state: stateTax, city };
}

export function calculateOffer(inputs: OfferInputs): OfferResult {
  const location = getLocation(inputs.locationId);
  const hourlyRate = clamp(inputs.hourlyRate);
  const hoursPerWeek = clamp(inputs.hoursPerWeek);
  const durationMonths = clamp(inputs.durationMonths);
  const monthlyRent = clamp(inputs.monthlyRent);

  const monthlyGross = (hourlyRate * hoursPerWeek * 52) / 12;

  // Withholding pass: payroll pretends this rate lasts all 12 months.
  const annualizedGross = monthlyGross * 12;
  const withheldAnnual = annualIncomeTaxes(annualizedGross, location);
  const monthlyWithholding: TaxBreakdown = {
    federal: withheldAnnual.federal / 12,
    state: withheldAnnual.state / 12,
    city: withheldAnnual.city / 12,
    fica: monthlyGross * data.fica.rate,
    total: 0,
  };
  monthlyWithholding.total =
    monthlyWithholding.federal +
    monthlyWithholding.state +
    monthlyWithholding.city +
    monthlyWithholding.fica;

  const monthlyTakeHome = monthlyGross - monthlyWithholding.total;
  const monthlyAfterRent = monthlyTakeHome - monthlyRent;

  // Liability pass: tax on the income actually earned.
  const totalGross = monthlyGross * durationMonths;
  const trueTaxes = annualIncomeTaxes(totalGross, location);
  const trueIncomeTax = trueTaxes.federal + trueTaxes.state + trueTaxes.city;
  const ficaTotal = totalGross * data.fica.rate; // flat, so withheld FICA == owed FICA
  const trueTaxTotal = trueIncomeTax + ficaTotal;

  const withheldIncomeTaxTotal =
    (monthlyWithholding.federal + monthlyWithholding.state + monthlyWithholding.city) *
    durationMonths;
  const estimatedRefund = Math.max(0, withheldIncomeTaxTotal - trueIncomeTax);

  const totalNet = totalGross - trueTaxTotal - monthlyRent * durationMonths;

  return {
    location,
    taxYear: data.taxYear,
    monthlyGross,
    monthlyWithholding,
    monthlyTakeHome,
    monthlyAfterRent,
    totalGross,
    trueTaxTotal,
    totalNet,
    estimatedRefund,
  };
}

import { calculateOffer, type OfferResult } from "@coop/tax";
import type { OfferFormState } from "./url-state";

const parse = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Parse raw form strings and run the tax engine. */
export function calculateFromForm(form: OfferFormState): OfferResult {
  return calculateOffer({
    hourlyRate: parse(form.rate),
    hoursPerWeek: parse(form.hours),
    durationMonths: parse(form.months),
    locationId: form.city,
    monthlyRent: form.home ? 0 : parse(form.rent),
  });
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function fmt(amount: number): string {
  // Avoid the "-$0" quirk on tiny negative rounding artifacts.
  const rounded = Math.round(amount);
  return currency.format(rounded === 0 ? 0 : rounded);
}

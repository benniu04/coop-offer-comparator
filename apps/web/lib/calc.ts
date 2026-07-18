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

export interface Verdict {
  bothLive: boolean;
  difference: number;
  winner: "a" | "b" | null;
  winnerResult: OfferResult | null;
  /** One sentence everyone agrees on: page title, OG card, and share blurb. */
  sentence: string;
}

/** The verdict compares what you actually keep over the whole co-op. */
export function compareOffers(resultA: OfferResult, resultB: OfferResult): Verdict {
  const bothLive = resultA.totalGross > 0 && resultB.totalGross > 0;
  const difference = resultA.totalNet - resultB.totalNet;
  const winner: "a" | "b" | null =
    bothLive && Math.abs(difference) >= 1 ? (difference > 0 ? "a" : "b") : null;
  const winnerResult = winner === "a" ? resultA : winner === "b" ? resultB : null;

  const sentence =
    winner && winnerResult
      ? `Offer ${winner.toUpperCase()} · ${winnerResult.location.label} leaves you ${fmt(
          Math.abs(difference)
        )} more over the co-op.`
      : bothLive
        ? "These offers come out even — pick the city you'd rather live in."
        : "Compare two co-op offers and see which one actually leaves you with more money.";

  return { bothLive, difference, winner, winnerResult, sentence };
}

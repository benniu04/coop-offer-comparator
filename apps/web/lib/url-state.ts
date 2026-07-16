import { LOCATIONS } from "@coop/tax";

/** Raw form state: strings so typing stays smooth; parsed at calculation time. */
export interface OfferFormState {
  rate: string;
  hours: string;
  months: string;
  city: string;
  rent: string;
  /** "Living at home / subsidized housing" — zeroes out rent. */
  home: boolean;
}

export const DEFAULT_A: OfferFormState = {
  rate: "40",
  hours: "40",
  months: "6",
  city: "boston",
  rent: "1600",
  home: false,
};

export const DEFAULT_B: OfferFormState = {
  rate: "45",
  hours: "40",
  months: "6",
  city: "nyc",
  rent: "2200",
  home: false,
};

/** Blank forms for the guided flow — cities pre-picked, everything else empty. */
export const EMPTY_A: OfferFormState = {
  rate: "",
  hours: "",
  months: "",
  city: "boston",
  rent: "",
  home: false,
};

export const EMPTY_B: OfferFormState = { ...EMPTY_A, city: "nyc" };

/** An offer is complete enough to compare once pay, hours, and length are set. */
export function isOfferComplete(form: OfferFormState): boolean {
  return [form.rate, form.hours, form.months].every((value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) && n > 0;
  });
}

type SearchParams = Record<string, string | string[] | undefined>;

const OFFER_PARAM_KEYS = ["r", "h", "m", "c", "rent", "home"].flatMap((key) => [
  `a${key}`,
  `b${key}`,
]);

/** True when the URL carries any offer data — a shared link or a refresh mid-comparison. */
export function hasOfferParams(params: SearchParams): boolean {
  return OFFER_PARAM_KEYS.some((key) => params[key] !== undefined);
}

const isValidCity = (id: string) => LOCATIONS.some((l) => l.id === id);

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function decodeOffer(params: SearchParams, prefix: "a" | "b", fallback: OfferFormState): OfferFormState {
  const get = (key: string) => first(params[`${prefix}${key}`]);
  const city = get("c");
  return {
    rate: get("r") ?? fallback.rate,
    hours: get("h") ?? fallback.hours,
    months: get("m") ?? fallback.months,
    city: city && isValidCity(city) ? city : fallback.city,
    rent: get("rent") ?? fallback.rent,
    home: get("home") === "1",
  };
}

/** Rebuild both offers from URL query params; missing params fall back to defaults. */
export function decodeOffers(params: SearchParams): { a: OfferFormState; b: OfferFormState } {
  return {
    a: decodeOffer(params, "a", DEFAULT_A),
    b: decodeOffer(params, "b", DEFAULT_B),
  };
}

function encodeOffer(query: URLSearchParams, prefix: "a" | "b", offer: OfferFormState) {
  query.set(`${prefix}r`, offer.rate);
  query.set(`${prefix}h`, offer.hours);
  query.set(`${prefix}m`, offer.months);
  query.set(`${prefix}c`, offer.city);
  query.set(`${prefix}rent`, offer.rent);
  if (offer.home) query.set(`${prefix}home`, "1");
}

/** Encode both offers as a query string so any comparison is a shareable link. */
export function encodeOffers(a: OfferFormState, b: OfferFormState): string {
  const query = new URLSearchParams();
  encodeOffer(query, "a", a);
  encodeOffer(query, "b", b);
  return query.toString();
}

"use client";

import { isOfferComplete, type OfferFormState } from "@/lib/url-state";
import { CitySelect, Field } from "./fields";

export function OfferStep({
  label,
  form,
  onChange,
  onBack,
  onContinue,
  continueLabel,
}: {
  label: "A" | "B";
  form: OfferFormState;
  onChange: (form: OfferFormState) => void;
  onBack: () => void;
  onContinue: () => void;
  continueLabel: string;
}) {
  const set = (patch: Partial<OfferFormState>) => onChange({ ...form, ...patch });
  const id = (name: string) => `step-${label}-${name}`;
  const complete = isOfferComplete(form);

  return (
    <div className="mx-auto max-w-lg pt-4 sm:pt-10">
      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-money">
        Step {label === "A" ? "1" : "2"} of 2
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl">Offer {label}</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {label === "A" ? "Where's the first offer?" : "Now the other one."}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-rule bg-card p-5 shadow-sm">
        <Field
          id={id("rate")}
          label="Pay"
          suffix="$/hr"
          placeholder="40"
          value={form.rate}
          onChange={(rate) => set({ rate })}
        />
        <Field
          id={id("hours")}
          label="Hours"
          suffix="hrs/wk"
          placeholder="40"
          value={form.hours}
          onChange={(hours) => set({ hours })}
        />
        <Field
          id={id("months")}
          label="Length"
          suffix="months"
          placeholder="6"
          value={form.months}
          onChange={(months) => set({ months })}
        />
        <CitySelect id={id("city")} value={form.city} onChange={(city) => set({ city })} />
        <Field
          id={id("rent")}
          label="Rent"
          suffix="$/mo"
          placeholder="1600"
          value={form.home ? "0" : form.rent}
          onChange={(rent) => set({ rent })}
          disabled={form.home}
        />
        <label
          htmlFor={id("home")}
          className="flex cursor-pointer items-end gap-2 pb-2 text-xs font-medium text-ink-soft"
        >
          <input
            id={id("home")}
            type="checkbox"
            checked={form.home}
            onChange={(e) => set({ home: e.target.checked })}
            className="h-4 w-4 accent-[--color-money]"
          />
          Living at home / free housing
        </label>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!complete}
          className="flex-1 rounded-xl bg-money px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-money/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money disabled:cursor-not-allowed disabled:opacity-40"
        >
          {continueLabel}
        </button>
      </div>
      {!complete && (
        <p className="mt-2 text-right text-xs text-ink-soft">
          Enter pay, hours, and length to continue.
        </p>
      )}
    </div>
  );
}

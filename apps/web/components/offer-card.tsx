"use client";

import { stateHasIncomeTax, type OfferResult } from "@coop/tax";
import { fmt } from "@/lib/calc";
import type { OfferFormState } from "@/lib/url-state";
import { CitySelect, Field } from "./fields";

function LedgerRow({
  label,
  amount,
  negative = false,
  bold = false,
  accent = false,
}: {
  label: string;
  amount: number;
  negative?: boolean;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between border-b border-dotted border-rule py-1.5 ${
        bold ? "font-semibold" : ""
      } ${accent ? "text-money" : negative ? "text-ink-soft" : ""}`}
    >
      <span className={bold ? "text-sm" : "text-xs"}>{label}</span>
      <span className={`figure ${bold ? "text-sm" : "text-xs"}`}>
        {negative && amount > 0 ? `−${fmt(amount)}` : fmt(amount)}
      </span>
    </div>
  );
}

export function OfferCard({
  label,
  form,
  onChange,
  result,
  isWinner,
}: {
  label: "A" | "B";
  form: OfferFormState;
  onChange: (form: OfferFormState) => void;
  result: OfferResult;
  isWinner: boolean;
}) {
  const set = (patch: Partial<OfferFormState>) => onChange({ ...form, ...patch });
  const id = (name: string) => `offer-${label}-${name}`;

  const { monthlyWithholding: w, location } = result;
  const noStateTax = !stateHasIncomeTax(location.state);
  const months = parseFloat(form.months) || 0;
  const hasRefund = result.estimatedRefund >= 1;

  return (
    <section
      aria-label={`Offer ${label}`}
      className={`relative rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
        isWinner ? "border-money" : "border-rule"
      }`}
    >
      {isWinner && (
        <span className="absolute -top-3 right-4 rotate-2 rounded-sm bg-mark px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-sm">
          Leaves you more
        </span>
      )}

      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-xl">Offer {label}</h2>
        <span className="text-xs text-ink-soft">{location.label}</span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <Field id={id("rate")} label="Pay" suffix="$/hr" value={form.rate} onChange={(rate) => set({ rate })} />
        <Field id={id("hours")} label="Hours" suffix="hrs/wk" value={form.hours} onChange={(hours) => set({ hours })} />
        <Field id={id("months")} label="Length" suffix="months" value={form.months} onChange={(months) => set({ months })} />
        <CitySelect id={id("city")} value={form.city} onChange={(city) => set({ city })} />
        <Field
          id={id("rent")}
          label="Rent"
          suffix="$/mo"
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

      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">
        Monthly paycheck
      </p>
      <LedgerRow label="Gross pay" amount={result.monthlyGross} />
      <LedgerRow label="Federal tax" amount={w.federal} negative />
      {noStateTax ? (
        <LedgerRow label={`${location.state} state tax — none!`} amount={0} accent />
      ) : (
        <LedgerRow label={`${location.state} state tax`} amount={w.state} negative />
      )}
      {location.cityTax && <LedgerRow label="NYC city tax" amount={w.city} negative />}
      <LedgerRow label="FICA (Social Security + Medicare)" amount={w.fica} negative />
      <LedgerRow label="Take-home (hits your bank)" amount={result.monthlyTakeHome} bold />
      <LedgerRow
        label={form.home ? "Rent — covered" : "Rent"}
        amount={form.home ? 0 : result.monthlyTakeHome - result.monthlyAfterRent}
        negative={!form.home}
      />

      <div className="mt-4 rounded-xl bg-paper px-4 py-3">
        <p className="text-xs font-semibold text-ink-soft">Left over each month</p>
        <p
          className={`figure mt-0.5 text-3xl font-semibold ${
            result.monthlyAfterRent < 0 ? "text-rent" : ""
          }`}
        >
          {fmt(result.monthlyAfterRent)}
        </p>
        <p className="mt-2 border-t border-dotted border-rule pt-2 text-xs text-ink-soft">
          Total kept over {months || "—"} month{months === 1 ? "" : "s"}:{" "}
          <span className="figure font-semibold text-ink">{fmt(result.totalNet)}</span>
        </p>
      </div>

      <div className="mt-4 border-t-2 border-dashed border-rule pt-3">
        {hasRefund ? (
          <div className="reveal-stub rounded-xl bg-money-soft px-4 py-3">
            <p className="text-sm font-semibold text-money">
              + {fmt(result.estimatedRefund)} back as a refund next April
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Payroll withholds as if you&rsquo;d earn {fmt(result.monthlyGross * 12)} all year. You
              won&rsquo;t — so you&rsquo;re overpaying taxes now and get the difference back when
              you file. It&rsquo;s already counted in the total above.
            </p>
          </div>
        ) : (
          <p className="px-1 text-xs text-ink-soft">
            {result.totalGross > 0
              ? "Withholding matches what you'd owe — no refund expected."
              : "Enter pay and hours to see this offer's numbers."}
          </p>
        )}
      </div>
    </section>
  );
}

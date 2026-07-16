"use client";

import { LOCATIONS } from "@coop/tax";

const NUMERIC = /^[0-9]*\.?[0-9]*$/;

export function Field({
  id,
  label,
  value,
  onChange,
  suffix,
  placeholder,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            if (NUMERIC.test(e.target.value)) onChange(e.target.value);
          }}
          className="figure w-full rounded-lg border border-rule bg-paper px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-soft/50 focus:border-money focus:outline-none disabled:opacity-40"
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-ink-soft">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function CitySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (city: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">
        City
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-rule bg-paper px-2 py-2 text-sm text-ink transition-colors focus:border-money focus:outline-none"
      >
        {LOCATIONS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

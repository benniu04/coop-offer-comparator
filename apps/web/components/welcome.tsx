"use client";

const BEATS = [
  {
    title: "What actually hits your bank",
    detail: "Withholding-based take-home, month by month.",
  },
  {
    title: "What rent really leaves you",
    detail: "The number that decides how the co-op feels.",
  },
  {
    title: "The refund you're owed next April",
    detail: "Payroll taxes you like a full-year salary. You aren't one.",
  },
];

export function Welcome({
  onStart,
  onExample,
}: {
  onStart: () => void;
  onExample: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg pt-6 sm:pt-14">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-money">
        Co-op Comparator
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight sm:text-5xl">
        Two offers.
        <br />
        One answer.
      </h1>
      <p className="mt-4 text-base leading-relaxed text-ink-soft">
        A higher hourly rate doesn&rsquo;t mean more money in your pocket. Enter both offers and
        see what actually lands in your bank — after taxes, rent, and the refund payroll never
        tells you about.
      </p>

      <ul className="mt-6 rounded-2xl border border-rule bg-card p-2 shadow-sm">
        {BEATS.map((beat, i) => (
          <li
            key={beat.title}
            className={`flex items-baseline gap-3 px-3 py-3 ${
              i > 0 ? "border-t border-dotted border-rule" : ""
            }`}
          >
            <span className="figure text-xs font-bold text-money">{"$".repeat(i + 1)}</span>
            <span>
              <span className="block text-sm font-semibold">{beat.title}</span>
              <span className="block text-xs text-ink-soft">{beat.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onStart}
          className="rounded-xl bg-money px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-money/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money"
        >
          Compare my offers
        </button>
        <button
          type="button"
          onClick={onExample}
          className="rounded-xl border border-rule bg-card px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-money hover:text-money focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money"
        >
          Show me an example first
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-soft">
        Takes about 30 seconds. No account, nothing saved.
      </p>
    </div>
  );
}

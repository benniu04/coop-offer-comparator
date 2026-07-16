"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateFromForm, fmt } from "@/lib/calc";
import {
  DEFAULT_A,
  DEFAULT_B,
  EMPTY_A,
  EMPTY_B,
  encodeOffers,
  type OfferFormState,
} from "@/lib/url-state";
import { OfferCard } from "@/components/offer-card";
import { OfferStep } from "@/components/offer-step";
import { Welcome } from "@/components/welcome";

export type Stage = "welcome" | "offer-a" | "offer-b" | "results";

export function Comparator({
  initialA,
  initialB,
  initialStage,
}: {
  initialA: OfferFormState;
  initialB: OfferFormState;
  initialStage: Stage;
}) {
  const [stage, setStage] = useState<Stage>(initialStage);
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [copied, setCopied] = useState(false);
  // Bumped on every entry into results so the reveal animation re-runs.
  const [revealKey, setRevealKey] = useState(0);

  const resultA = useMemo(() => calculateFromForm(a), [a]);
  const resultB = useMemo(() => calculateFromForm(b), [b]);

  // The verdict compares what you actually keep over the whole co-op.
  const bothLive = resultA.totalGross > 0 && resultB.totalGross > 0;
  const difference = resultA.totalNet - resultB.totalNet;
  const winner: "a" | "b" | null =
    bothLive && Math.abs(difference) >= 1 ? (difference > 0 ? "a" : "b") : null;
  const winnerResult = winner === "a" ? resultA : winner === "b" ? resultB : null;

  // Keep the URL in sync (debounced) so every comparison is a shareable link —
  // but only once the user is looking at results.
  useEffect(() => {
    if (stage !== "results") return;
    const timer = setTimeout(() => {
      window.history.replaceState(null, "", `?${encodeOffers(a, b)}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [a, b, stage]);

  function goToResults() {
    setRevealKey((k) => k + 1);
    setStage("results");
  }

  function showExample() {
    setA(DEFAULT_A);
    setB(DEFAULT_B);
    goToResults();
  }

  function startOver() {
    setA(EMPTY_A);
    setB(EMPTY_B);
    setCopied(false);
    window.history.replaceState(null, "", window.location.pathname);
    setStage("welcome");
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?${encodeOffers(a, b)}`;
    window.history.replaceState(null, "", url);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (stage === "welcome") {
    return <Welcome onStart={() => setStage("offer-a")} onExample={showExample} />;
  }

  if (stage === "offer-a" || stage === "offer-b") {
    const isA = stage === "offer-a";
    return (
      <OfferStep
        label={isA ? "A" : "B"}
        form={isA ? a : b}
        onChange={isA ? setA : setB}
        onBack={() => setStage(isA ? "welcome" : "offer-a")}
        onContinue={() => (isA ? setStage("offer-b") : goToResults())}
        continueLabel={isA ? "Next: Offer B" : "See which offer wins"}
      />
    );
  }

  return (
    <div key={revealKey}>
      <header className="reveal mb-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-money">
          Two offers, one answer
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight">
          Co-op Comparator
        </h1>
      </header>

      <div
        className="reveal mb-5 flex flex-col gap-3 rounded-xl border border-rule bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        style={{ animationDelay: "0.1s" }}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm sm:text-base">
          {winner && winnerResult ? (
            <>
              <span className="font-semibold">
                Offer {winner.toUpperCase()} · {winnerResult.location.label}
              </span>{" "}
              leaves you{" "}
              <span className="figure font-semibold text-money">{fmt(Math.abs(difference))}</span>{" "}
              more over the co-op.
            </>
          ) : bothLive ? (
            <>These offers come out even — pick the city you&rsquo;d rather live in.</>
          ) : (
            <>Fill in both offers to see which one wins.</>
          )}
        </p>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-rule bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-money hover:text-money focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money"
        >
          {copied ? "Link copied ✓" : "Copy link to share"}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="reveal" style={{ animationDelay: "0.2s" }}>
          <OfferCard label="A" form={a} onChange={setA} result={resultA} isWinner={winner === "a"} />
        </div>
        <div className="reveal" style={{ animationDelay: "0.32s" }}>
          <OfferCard label="B" form={b} onChange={setB} result={resultB} isWinner={winner === "b"} />
        </div>
      </div>

      <div className="reveal mt-6 text-center" style={{ animationDelay: "0.45s" }}>
        <button
          type="button"
          onClick={startOver}
          className="text-xs font-semibold text-ink-soft transition-colors hover:text-money focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-money"
        >
          Start over with different offers
        </button>
      </div>
    </div>
  );
}

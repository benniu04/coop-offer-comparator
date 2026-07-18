import type { Metadata } from "next";
import { calculateFromForm, compareOffers } from "@/lib/calc";
import { decodeOffers, EMPTY_A, EMPTY_B, encodeOffers, hasOfferParams } from "@/lib/url-state";
import { Comparator } from "./comparator";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Shared links unfurl with the actual verdict instead of the generic card. */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  if (!hasOfferParams(params)) return {};

  const { a, b } = decodeOffers(params);
  const resultA = calculateFromForm(a);
  const resultB = calculateFromForm(b);
  const verdict = compareOffers(resultA, resultB);

  const cityA = resultA.location.label.split(",")[0];
  const cityB = resultB.location.label.split(",")[0];
  const title = `${cityA} vs ${cityB}`;
  const ogImage = `/api/og?${encodeOffers(a, b)}`;

  return {
    title,
    description: verdict.sentence,
    openGraph: {
      title: `${title} · Co-op Comparator`,
      description: verdict.sentence,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · Co-op Comparator`,
      description: verdict.sentence,
      images: [ogImage],
    },
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // A URL carrying offer data is a shared link (or a refresh mid-comparison):
  // skip the guided flow and show the comparison immediately.
  const sharedOrResumed = hasOfferParams(params);
  const { a, b } = decodeOffers(params);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-10 pt-8 sm:px-6">
      <Comparator
        initialA={sharedOrResumed ? a : EMPTY_A}
        initialB={sharedOrResumed ? b : EMPTY_B}
        initialStage={sharedOrResumed ? "results" : "welcome"}
      />
    </div>
  );
}

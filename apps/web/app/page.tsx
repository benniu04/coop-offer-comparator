import { decodeOffers, EMPTY_A, EMPTY_B, hasOfferParams } from "@/lib/url-state";
import { Comparator } from "./comparator";

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

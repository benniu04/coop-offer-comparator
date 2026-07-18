import { ImageResponse } from "next/og";
import { calculateFromForm, compareOffers, fmt } from "@/lib/calc";
import { decodeOffers } from "@/lib/url-state";

export const runtime = "edge";

const COLORS = {
  paper: "#eef3ef",
  card: "#ffffff",
  ink: "#16302b",
  inkSoft: "#5c7a6e",
  money: "#0b8a5c",
  mark: "#ffe45c",
  rule: "#d9e5dd",
};

const SIZE = { width: 1200, height: 630 };

function OfferPanel({
  label,
  city,
  monthlyAfterRent,
  isWinner,
}: {
  label: string;
  city: string;
  monthlyAfterRent: number;
  isWinner: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: COLORS.card,
        border: `3px solid ${isWinner ? COLORS.money : COLORS.rule}`,
        borderRadius: 24,
        padding: "30px 36px",
        position: "relative",
      }}
    >
      {isWinner && (
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -18,
            right: 24,
            backgroundColor: COLORS.mark,
            color: COLORS.ink,
            fontSize: 20,
            fontWeight: 700,
            padding: "6px 16px",
            borderRadius: 6,
            transform: "rotate(2deg)",
          }}
        >
          LEAVES YOU MORE
        </div>
      )}
      <div style={{ display: "flex", fontSize: 26, fontWeight: 700, color: COLORS.ink }}>
        Offer {label}
      </div>
      <div style={{ display: "flex", fontSize: 22, color: COLORS.inkSoft, marginTop: 2 }}>
        {city}
      </div>
      <div style={{ display: "flex", fontSize: 20, color: COLORS.inkSoft, marginTop: 22 }}>
        Left over each month
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 54,
          fontWeight: 700,
          color: isWinner ? COLORS.money : COLORS.ink,
          fontFamily: "Menlo, monospace",
        }}
      >
        {fmt(monthlyAfterRent)}
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    const { a, b } = decodeOffers(params);
    const resultA = calculateFromForm(a);
    const resultB = calculateFromForm(b);
    const verdict = compareOffers(resultA, resultB);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "56px 64px",
            backgroundColor: COLORS.paper,
            fontFamily: "Georgia, serif",
          }}
        >
          <div
            style={{
              display: "flex",
              color: COLORS.money,
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            CO-OP COMPARATOR
          </div>
          <div
            style={{
              display: "flex",
              color: COLORS.ink,
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              marginTop: 16,
              marginBottom: 40,
              maxWidth: 1050,
            }}
          >
            {verdict.sentence}
          </div>
          <div style={{ display: "flex", gap: 32, flex: 1 }}>
            <OfferPanel
              label="A"
              city={resultA.location.label}
              monthlyAfterRent={resultA.monthlyAfterRent}
              isWinner={verdict.winner === "a"}
            />
            <OfferPanel
              label="B"
              city={resultB.location.label}
              monthlyAfterRent={resultB.monthlyAfterRent}
              isWinner={verdict.winner === "b"}
            />
          </div>
          <div style={{ display: "flex", color: COLORS.inkSoft, fontSize: 20, marginTop: 32 }}>
            After taxes and rent — including the refund payroll never tells you about. Estimates
            only, not tax advice.
          </div>
        </div>
      ),
      SIZE
    );
  } catch {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px",
            backgroundColor: COLORS.paper,
            color: COLORS.ink,
            fontFamily: "Georgia, serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>
            Two offers. One answer.
          </div>
          <div style={{ display: "flex", color: COLORS.inkSoft, fontSize: 34, marginTop: 24 }}>
            See which co-op offer actually leaves you with more money.
          </div>
        </div>
      ),
      SIZE
    );
  }
}

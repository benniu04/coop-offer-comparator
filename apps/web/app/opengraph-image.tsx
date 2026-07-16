import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Co-op Comparator — see which offer actually leaves you with more money";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = {
  paper: "#eef3ef",
  card: "#ffffff",
  ink: "#16302b",
  inkSoft: "#5c7a6e",
  money: "#0b8a5c",
  mark: "#ffe45c",
  rule: "#d9e5dd",
};

export default function OpengraphImage() {
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
        <div
          style={{
            display: "flex",
            color: COLORS.money,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 6,
            marginBottom: 18,
          }}
        >
          CO-OP COMPARATOR
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>
          Two offers. One answer.
        </div>
        <div
          style={{
            display: "flex",
            color: COLORS.inkSoft,
            fontSize: 34,
            marginTop: 26,
            maxWidth: 900,
            lineHeight: 1.35,
          }}
        >
          See which co-op offer actually leaves you with more money — after taxes, rent, and the
          refund payroll never tells you about.
        </div>
        <div style={{ display: "flex", marginTop: 44, alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              backgroundColor: COLORS.mark,
              color: COLORS.ink,
              fontSize: 24,
              fontWeight: 700,
              padding: "10px 22px",
              borderRadius: 8,
              transform: "rotate(-1deg)",
            }}
          >
            LEAVES YOU MORE
          </div>
          <div style={{ display: "flex", color: COLORS.money, fontSize: 28, fontWeight: 700 }}>
            + your refund next April
          </div>
        </div>
      </div>
    ),
    size
  );
}

import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk, Spline_Sans_Mono, Young_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TAX_YEAR } from "@coop/tax";
import "./globals.css";

const youngSerif = Young_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-young-serif",
});

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-schibsted",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-spline-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://coop-comparator.vercel.app";
const DESCRIPTION =
  "Compare two co-op offers and see which one actually leaves you with more money — after taxes, rent, and the tax refund nobody told you about.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Co-op Comparator",
    template: "%s · Co-op Comparator",
  },
  description: DESCRIPTION,
  openGraph: {
    title: "Co-op Comparator — two offers, one answer",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Co-op Comparator",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Co-op Comparator — two offers, one answer",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${youngSerif.variable} ${schibsted.variable} ${splineMono.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <footer className="border-t border-rule bg-card/60 px-4 py-4 text-center text-xs text-ink-soft">
            Estimates only. Not tax advice. Single filer, {TAX_YEAR} rates.
          </footer>
        </div>
        <Analytics />
      </body>
    </html>
  );
}

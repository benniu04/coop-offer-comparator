# Co-op Comparator

**Live at [coop-comparator.vercel.app](https://coop-comparator.vercel.app)**

Compare two co-op/internship offers and see which one **actually** leaves you with more money — on the web and on your phone.

Most students compare offers by hourly rate. But rate doesn't decide what you keep: taxes and rent do. And there's a twist most students have never had explained to them:

## The insight: withholding lies to you

Co-ops are **partial-year income**, but payroll withholding assumes your pay rate continues all year. If you earn $40/hr for 6 months, every paycheck is taxed as though you make ~$83,000/year — pushing you into brackets you will never actually reach.

So there are two different numbers, and this app shows both:

1. **Monthly take-home (withholding-based)** — what actually hits your bank account. This determines whether you can make rent.
2. **True value (actual tax liability)** — tax computed on only the income you'll really earn, with the standard deduction and real brackets. This determines which offer is genuinely better.

The gap between them is money you get back: **"~$X back as a refund next April."** That reveal is the product. It's why a 6-month Boston co-op can quietly out-earn a flashier NYC offer, and why Seattle (no state income tax) feels like a cheat code.

## How it flows

First-time visitors get a guided flow: welcome → enter Offer A → enter Offer B → an animated results reveal that lands the refund insight last. A "Show me an example" shortcut loads a Boston-vs-NYC demo for anyone who wants numbers before typing. **Shared links skip all of that** — a URL with offer params opens directly on the comparison, so the growth loop stays one tap. Animations respect reduced-motion settings on both platforms.

## Running it

```bash
npm install

npm run dev      # web app → http://localhost:3000
npm run mobile   # native app → Expo (press i for iOS simulator, or scan the QR in Expo Go)
npm test         # unit tests for the tax engine
npm run build    # production web build (deploys to Vercel with zero config)
```

## Monorepo layout

```
packages/tax     # the actual product: pure, dependency-free, fully tested tax math
  src/tax-data.json   # every rate, bracket, and deduction — updated once a year
  src/tax.ts          # the calculation module
  src/tax.test.ts     # 25 unit tests incl. hand-computed fixtures
apps/web         # Next.js (App Router) + Tailwind — all state in URL params, shareable links
apps/mobile      # Expo (React Native) — same math, native share sheet
```

Both apps are thin UIs over `@coop/tax`. The math exists exactly once.

### How the math works

Two passes over the same bracket tables:

- **Withholding pass** — annualize monthly gross (×12), apply standard deduction + brackets for federal/state/city, plus flat 7.65% FICA. Divide by 12. That's each paycheck.
- **Liability pass** — apply the same deductions and brackets to only the income actually earned over the co-op.
- **Refund** = withheld income tax − true liability. (FICA is flat, so it cancels.)
- Monthly numbers use withholding (that's your cash flow). The co-op total uses true liability (that's your real money — the refund comes back).

### Supported locations

Boston, NYC, Seattle, San Francisco, Hartford, Austin, Chicago, Portland (ME). A location is modeled as a **state code + display label** — only NYC carries an extra city income tax. Chicago is deliberately *not* a second NYC: Illinois has no local income tax.

### Updating for a new tax year

Edit `packages/tax/src/tax-data.json` — brackets, deductions, and the top-level `taxYear` field. No logic changes needed. Current data: **tax year 2026** (post-OBBBA federal brackets, verified against IRS/Tax Foundation figures).

## Deliberately cut from v1 (and why)

- **Accounts, auth, saved offers** — a comparison *is* a URL. Sharing a link is both persistence and the growth loop.
- **A database** — same reason. Zero infra means zero-config deploys and nothing to break.
- **More than two offers** — two is the real decision students face; three-way grids bury the verdict.
- **Other cities/states** — eight locations cover the common co-op hubs and every interesting tax archetype (flat, progressive, city tax, no tax).
- **401(k), health premiums, other deductions** — most co-ops don't offer them, and each one dilutes the one insight the tool exists to deliver.
- **Filing nuance** — single filer, resident of the work state, no credits (CT's exemption phase-out, CA's exemption credit, and nonresident/part-year rules are ignored). The footer says it: estimates only, not tax advice.

## Shipping the native app (when you're ready)

The Expo app currently runs via `npm run mobile` (Expo Go / simulator) — a development path, not a store release. To ship it:

1. Apple Developer Program account ($99/yr) and/or Google Play Console ($25 one-time).
2. `npx eas build --platform ios` (EAS handles signing) → `npx eas submit`.
3. App Store review needs a privacy policy URL — trivial here since the app collects nothing.
4. Expect a few days of review lead time.

Until then, the deployed web app covers phone users — it's fully responsive and shareable.

## What's next

- Deploy the web app and point the mobile share button at it (`EXPO_PUBLIC_WEB_URL`)
- Nonresident/home-state filing (the real rules for many co-op students)
- "Explain this math" expandable showing every bracket step
- Cost-of-living beyond rent (transit, groceries) as a labeled rough estimate
- More cities once requested — each is one JSON entry

# Tariff Refund Check

Free, private IEEPA tariff refund checker for small importers. Drop in an ACE **ES-003** report (CSV) and it:

- totals the IEEPA duties (HTS 9903.01.xx / 9903.02.xx, or ACE's IEEPA indicator), leaving Section 301/232/MFN out;
- sorts every entry by what can still be done: **CAPE now** (unliquidated or liquidated ≤ 80 days), **protest window** (≤ 180 days), **final** (court route), or **needs a check**;
- flags deadlines in the next 30 days;
- builds CAPE Declaration CSVs in CBP's format (header `Entry Number`, one entry per row, split per filer code and at 9,999 entries).

Everything runs in the browser. `public/_headers` sets a Content-Security-Policy with `connect-src 'none'`, so the deployed page cannot send data anywhere. If you add analytics, email capture or payments later, update that policy and the privacy copy together.

Rules reflect CBP guidance and CIT orders as of Nov 2, 2026 (`src/engine/analyze.ts`, `RULES_AS_OF`). They change; re-check the CBP IEEPA refunds page before relying on them.

## Develop

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm check      # typecheck + tests + lint
pnpm build      # static site in dist/
```

## Deploy (free, Cloudflare Pages)

```bash
npx wrangler login                                   # once, opens the browser
pnpm build && npx wrangler pages deploy dist --project-name tariff-refund-check
```

Cloudflare Pages' free plan allows commercial use and serves `public/_headers`.

## Not legal advice

This is an independent tool, not a licensed customs broker or law firm, and not affiliated with CBP. Have a licensed customs broker or trade attorney review the rules and copy before charging for it.

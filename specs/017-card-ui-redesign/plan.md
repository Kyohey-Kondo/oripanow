# Implementation Plan: Oripa Card UI Redesign

**Branch**: `017-card-ui-redesign` | **Date**: 2026-04-29 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/017-card-ui-redesign/spec.md`

## Summary

Replace the plain table layout on `/oripa` with a dark-themed, responsive card grid that matches the `oripa-card-ui.html` mockup. Each card shows price (color-coded by tier), stock count, store name, timestamp, last-one prize, and atari card badges. No backend, data model, or URL contract changes required — this is a pure presentation change.

## Technical Context

**Language/Version**: TypeScript 5.8 / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, SSR, `force-dynamic`), React 19, CSS Modules, `next/font/google`  
**Storage**: N/A (read-only, existing DynamoDB queries unchanged)  
**Testing**: Vitest (unit tests for `lib/` only); Playwright screenshot verification for UI  
**Target Platform**: Web browser (desktop + mobile, 375px – 1440px viewport)  
**Project Type**: Web application (Next.js SSR)  
**Performance Goals**: No change from current; page is already SSR + CloudFront cached  
**Constraints**: No new npm dependencies beyond `next/font/google` (already part of Next.js); no new routes or Lambda functions  
**Scale/Scope**: Single page redesign (`/oripa` list view); shop detail page is out of scope

## Constitution Check

Constitution file is a placeholder template — no active gates to check. Proceeding without violations.

## Project Structure

### Documentation (this feature)

```text
specs/017-card-ui-redesign/
├── plan.md              ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── oripa-page-url.md
├── checklists/
│   └── requirements.md
└── tasks.md             ← created by /speckit.tasks (not yet)
```

### Source Code Changes

```text
apps/web/
├── app/
│   ├── layout.tsx                          EDIT   — add Orbitron + Noto Sans JP fonts
│   └── oripa/
│       ├── page.tsx                        REWRITE — table → dark card grid
│       ├── oripa.module.css                CREATE  — dark theme CSS Module
│       └── components/
│           └── OripaCard.tsx              CREATE  — card Server Component
└── lib/
    └── tweet-utils.ts                     CREATE  — extract tweetIdToDate helper
```

**Structure Decision**: Single web app only. No new projects, packages, or Lambda functions. Changes are confined to `apps/web/`.

## Phase 0: Research (complete)

See [research.md](./research.md) for all decisions. Summary:

| Decision | Chosen |
|---|---|
| Font loading | `next/font/google` (Orbitron + Noto Sans JP) |
| Styling | CSS Modules (existing convention) |
| Price tiers | high ≥ ¥10k (gold), mid ¥5k–¥9,999 (blue), low < ¥5k (green) |
| Component scope | `OripaCard` Server Component, page stays Server Component |
| Dark theme scope | Page-level wrapper div only; no route layout added |
| Tweet sidebar | Retained; same responsive behavior as current |
| CSS variables | Scoped inside `.page` wrapper selector |

## Phase 1: Design (complete)

### Files to create/modify

#### 1. `apps/web/lib/tweet-utils.ts` (CREATE)

Extract the `tweetIdToDate` function (duplicated across `oripa/page.tsx` and `oripa/shops/[storeId]/page.tsx`) into a shared util:

```ts
/** Derive tweet timestamp from Twitter snowflake ID. */
export function tweetIdToDate(tweetId: string): Date {
  const TWITTER_EPOCH = 1288834974657n;
  return new Date(Number((BigInt(tweetId) >> 22n) + TWITTER_EPOCH));
}
```

#### 2. `apps/web/app/layout.tsx` (EDIT)

- Import `Orbitron` and `Noto_Sans_JP` from `next/font/google`
- Expose as CSS variables (`--font-orbitron`, `--font-body`) on `<html>`
- Keep existing GA, Footer, and AdBanner unchanged

#### 3. `apps/web/app/oripa/oripa.module.css` (CREATE)

Full dark-theme CSS Module including:
- `.page` — full-width dark wrapper; defines all CSS custom properties (`--bg`, `--surface`, `--accent`, etc.)
- `.header` — flex row; logo + live badge
- `.logo`, `.logoText`, `.logoBadge`, `.liveDot` — header branding
- `.areaTabs` — horizontal scroll pill container
- `.tab`, `.tabActive` — pill button states
- `.main` — max-width grid container
- `.sectionHeader` — label + count row
- `.cardsGrid` — `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- `.sidebar` — tweet oEmbed sidebar (right on desktop, top-horizontal on mobile)
- `.pagination` — flex row of page buttons
- `.pageBtn`, `.pageBtnActive` — pagination button states
- Media query `@media (max-width: 640px)` — single-column grid, horizontal tab/sidebar scroll

#### 4. `apps/web/app/oripa/components/OripaCard.tsx` (CREATE)

Server Component accepting `OripaPostSummary` + optional `tweetTimestamp: string`. Renders:
- Color-coded top bar (via `data-tier` or inline style based on `getPriceTier(price)`)
- Card body: shop name link, timestamp, price + stock pill
- Awards section (ラスト / あたり badge rows, or no-info placeholder)
- Card footer: area tag + tweet link

```ts
type Props = {
  post: OripaPostSummary;
  tweetTimestamp: string;
};
```

#### 5. `apps/web/app/oripa/page.tsx` (REWRITE)

Keep:
- `getTodayOnSalePosts` data fetch
- `fetchOEmbed` + sidebar
- `searchParams` for area/page
- Pagination logic (PAGE_SIZE=20, MAX_PAGES=3)

Remove:
- `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<td>` markup
- All inline style objects for the table
- Import of `../page.module.css`

Add:
- Import `styles` from `./oripa.module.css`
- Import `OripaCard` from `./components/OripaCard`
- Import `tweetIdToDate` from `../../lib/tweet-utils`
- Dark-themed header markup (logo + LIVE badge)
- Area tabs markup
- `<div className={styles.cardsGrid}>` rendering `<OripaCard>` per post
- Updated pagination markup using `.pagination` / `.pageBtn` classes

## Complexity Tracking

No constitution violations. No complexity justification required.

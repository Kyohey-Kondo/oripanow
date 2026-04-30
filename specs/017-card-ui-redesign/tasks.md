# Tasks: Oripa Card UI Redesign

**Input**: Design documents from `specs/017-card-ui-redesign/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No TDD required — UI verification via Playwright screenshots per quickstart.md.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new files/directories needed across all user stories.

- [x] T001 Create directory `apps/web/app/oripa/components/`
- [x] T002 [P] Verify dev server starts: `pnpm --filter @oripa-now/web dev` (confirm no existing errors before changes)

**Checkpoint**: Directory structure in place, dev server baseline confirmed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities and font setup that ALL user story phases depend on.

**⚠️ CRITICAL**: Complete before any user story implementation.

- [x] T003 Extract `tweetIdToDate` to `apps/web/lib/tweet-utils.ts` (pure function, no deps)
- [x] T004 Update `apps/web/app/oripa/page.tsx` to import `tweetIdToDate` from `../../lib/tweet-utils` and remove local definition
- [x] T005 Update `apps/web/app/oripa/shops/[storeId]/page.tsx` to import `tweetIdToDate` from `../../../../lib/tweet-utils` and remove local definition
- [x] T006 [P] Edit `apps/web/app/layout.tsx`: add `next/font/google` imports for `Orbitron` and `Noto_Sans_JP`; expose as `--font-orbitron` and `--font-body` CSS variables on `<html>`; apply `--font-body` as `fontFamily` on body

**Checkpoint**: `tweetIdToDate` shared; fonts available as CSS variables sitewide. Run `pnpm --filter @oripa-now/web typecheck` — no new errors.

---

## Phase 3: User Story 1 — Browse Oripa Posts as Cards (Priority: P1) 🎯 MVP

**Goal**: Replace the table on `/oripa` with a dark-themed responsive card grid showing all post fields.

**Independent Test**: Navigate to `/oripa` on the dev server; confirm dark background, card grid (≥2 columns on desktop), price displayed on each card, color-coded top bar.

### Implementation

- [x] T007 [US1] Create `apps/web/app/oripa/oripa.module.css` — dark theme CSS Module with: `.page` wrapper + CSS custom properties (`--bg #0a0c14`, `--surface`, `--accent`, `--accent2`, `--accent3`, `--text`, `--text-muted`, `--border`); `.header`, `.logo`, `.logoText`, `.liveDot`, `.liveBadge`; `.areaTabs`, `.tab`, `.tabActive`; `.sectionHeader`, `.countBadge`; `.cardsGrid` (`repeat(auto-fill, minmax(280px, 1fr))`); `.sidebar`, `.tweetList`; `.pagination`, `.pageBtn`, `.pageBtnActive`; `@media (max-width: 640px)` single-column + horizontal scroll rules
- [x] T008 [US1] Create `apps/web/app/oripa/components/OripaCard.tsx` — Server Component accepting `{ post: OripaPostSummary; tweetTimestamp: string }`; implement `getPriceTier(price?)` returning `'high'|'mid'|'low'|'unknown'`; render: color-coded top bar, store name link (`/oripa/shops/[storeId]`), timestamp, price (`¥X,XXX` or `—`), stock pill, awards section (ラスト / あたり badges or no-info placeholder), area tag, tweet link (`https://x.com/[username]/status/[tweetId]`)
- [x] T009 [US1] Rewrite `apps/web/app/oripa/page.tsx`: remove `<table>` markup and all inline table style objects; remove `import styles from '../page.module.css'`; add `import styles from './oripa.module.css'`; add `import { OripaCard } from './components/OripaCard'`; add `import { tweetIdToDate } from '../../lib/tweet-utils'`; add dark-theme wrapper `<div className={styles.page}>`; add header with logo + LIVE badge; add area tabs nav; add section header with count; render `<div className={styles.cardsGrid}>` with `<OripaCard>` per `pageItems` item; update pagination to use `.pagination`/`.pageBtn`/`.pageBtnActive` classes; retain tweet oEmbed sidebar and ad banners
- [x] T010 [US1] Run `pnpm --filter @oripa-now/web typecheck` — fix any type errors
- [x] T011 [US1] Take Playwright screenshot of `/oripa` at desktop (1280×900) and confirm: dark background visible, cards rendered in grid, price shown on cards, header with LIVE badge present

**Checkpoint**: US1 fully functional. Table replaced by card grid. Typecheck passes.

---

## Phase 4: User Story 2 — Awards Badges on Card (Priority: P2)

**Goal**: Confirm ラスト / あたり badge rows render correctly and no-info placeholder shows when absent.

**Independent Test**: Identify a post in DynamoDB with `lastOnePrizeName` set — confirm "ラスト" badge row appears. Identify a post without either field — confirm "当たり・ラストワン情報なし" appears.

*Note: The badge rendering logic is implemented in T008 (`OripaCard.tsx`). This phase verifies correctness and handles edge cases.*

### Implementation

- [x] T012 [US2] Review `OripaCard.tsx` awards rendering: verify `lastOnePrizeName` shows "ラスト" badge; verify `atariCards` join with ` / ` (≤3 items) or truncate with `… (+N)` (>3 items); verify both-absent case shows placeholder text
- [x] T013 [US2] Add stub data to `apps/web/src/stubs/oripa-posts.ts` (if it exists) with test cases: (a) post with both awards, (b) post with only lastOne, (c) post with only atariCards, (d) post with neither
- [x] T014 [US2] Take Playwright screenshot of `/oripa` — confirm at least one card shows award badges and at least one shows the no-info placeholder (use real or stub data)

**Checkpoint**: All four award data combinations render correctly on cards.

---

## Phase 5: User Story 3 — Area Filter Tabs (Priority: P3)

**Goal**: Area tabs render as styled pill buttons; active tab is visually distinct; tabs scroll on mobile.

**Independent Test**: Open `/oripa` — "すべて" tab active. Click "秋葉原" tab — URL becomes `/oripa?area=akihabara`, only 秋葉原 cards shown, 秋葉原 tab active.

*Note: Tab markup and styles are introduced in T007 and T009. This phase verifies correct behavior and mobile layout.*

### Implementation

- [x] T015 [US3] Verify area tab active state logic in `apps/web/app/oripa/page.tsx`: confirm `area === key` applies `styles.tabActive` class; confirm `!area` applies `styles.tabActive` to the "すべて" tab
- [x] T016 [US3] Take Playwright screenshot of `/oripa?area=akihabara` at desktop — confirm 秋葉原 tab active (visually distinct), all visible area tags read "秋葉原"
- [x] T017 [US3] Take Playwright screenshot of `/oripa` at mobile viewport (375×812) — confirm area tabs are visible, single-column card grid, no horizontal overflow of page content

**Checkpoint**: Area filtering works; active tab visually distinct; mobile layout confirmed.

---

## Phase 6: User Story 4 — Navigation Links (Priority: P4)

**Goal**: Store name links to shop detail page; tweet links open original post in new tab.

**Independent Test**: Click store name on a card → navigates to `/oripa/shops/[storeId]`. Click "ポストを見る" → opens `https://x.com/[username]/status/[tweetId]` in new tab.

*Note: Links are rendered in T008 (`OripaCard.tsx`). This phase verifies correctness.*

### Implementation

- [x] T018 [US4] Inspect rendered HTML of `OripaCard` in browser DevTools or Playwright snapshot — confirm store name `<a>` href points to `/oripa/shops/[storeId]`
- [x] T019 [US4] Confirm tweet link `<a>` has `target="_blank"` and `rel="noopener noreferrer"` and href is `https://x.com/[twitterUsername]/status/[tweetId]`

**Checkpoint**: All card links are correct and functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass across all user stories.

- [x] T020 [P] Run `pnpm --filter @oripa-now/web lint` — fix any lint errors in changed files
- [x] T021 [P] Run `pnpm --filter @oripa-now/web test` — confirm no existing unit tests regress
- [x] T022 Run `pnpm build` from repo root — confirm production build succeeds (no build errors)
- [x] T023 [P] Take Playwright full-page screenshot at desktop and side-by-side compare with `oripa-card-ui.html` reference — confirm visual parity (dark theme, card grid, color-coded bars, badges, tabs)
- [x] T024 [P] Take Playwright full-page screenshot at mobile (375×812) — confirm no horizontal overflow, readable card content, horizontal tab scroll
- [x] T025 Verify empty state: navigate to `/oripa?area=kawagoe` (or any area with no posts) — confirm "No stores..." message renders without breaking layout
- [x] T026 [P] Delete `oripa-card-ui.html` from project root (design reference file, not needed in production)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2
- **US2 (Phase 4)**: Depends on Phase 3 (T008 must exist)
- **US3 (Phase 5)**: Depends on Phase 3 (T007 + T009 must exist)
- **US4 (Phase 6)**: Depends on Phase 3 (T008 must exist)
- **Polish (Phase 7)**: Depends on all user story phases

### Within Phase 3 (US1 — critical path)

```
T007 (CSS Module) ──┐
                     ├──→ T009 (page.tsx rewrite) → T010 (typecheck) → T011 (screenshot)
T008 (OripaCard) ───┘
```

T007 and T008 are independent and can be written in parallel.

### Parallel Opportunities

```bash
# Phase 2: all parallel
T003  # tweet-utils.ts
T004  # update oripa/page.tsx import
T005  # update shops page import
T006  # layout.tsx fonts

# Phase 3: CSS and component in parallel
T007  # oripa.module.css
T008  # OripaCard.tsx
# Then T009 depends on both

# Phases 4, 5, 6: all independent, can run in parallel after Phase 3
T012-T014  # US2 awards
T015-T017  # US3 tabs
T018-T019  # US4 links

# Phase 7: most tasks parallel
T020, T021, T023, T024, T026  # parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 card grid
4. **STOP and VALIDATE**: Screenshot at desktop + mobile
5. All other features (awards, tabs, links) are implemented as part of US1 — validate they work

### Incremental Delivery

The card grid (US1) is the gating deliverable. US2–US4 are verification phases that confirm features already built into the card component work correctly. The natural delivery sequence is:

1. Phase 1 + 2 → shared utilities ready
2. Phase 3 (US1) → **card grid live** — this is the MVP
3. Phases 4–6 (US2–US4) → verification passes — can run in parallel
4. Phase 7 → polish + build check → ready to deploy

---

## Notes

- [P] tasks = different files, no blocking dependencies
- No TDD approach — verification is by Playwright screenshots and typecheck
- `oripa-card-ui.html` is the design reference; delete it in T026 after verification
- Shop detail page (`/oripa/shops/[storeId]`) is **out of scope** — only the shared `tweetIdToDate` extraction touches it (T005)
- Ad banners in `layout.tsx` and `page.tsx` are preserved unchanged

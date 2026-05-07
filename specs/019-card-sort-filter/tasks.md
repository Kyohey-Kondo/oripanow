# Tasks: Card Sort and Filter

**Input**: Design documents from `/specs/019-card-sort-filter/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- File paths are absolute from repo root

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions and shared utilities that both US1 (sort) and US2 (filter) depend on. Must be complete before any user story work.

**⚠️ CRITICAL**: US1 and US2 cannot start until T001 is complete.

- [x] T001 Add `SortOption`, `FilterOption` type definitions and `VALID_SORTS`, `VALID_FILTERS` constant arrays to `apps/web/lib/posts.ts`

**Checkpoint**: Types are exported and available — US1 and US2 can now proceed independently.

---

## Phase 2: User Story 1 — Sort Cards by Desired Order (Priority: P1) 🎯 MVP

**Goal**: Users can pick a sort order (newest / price / stock, ascending or descending) and the card list reflects it. State is encoded in the URL.

**Independent Test**: Visit `/oripa?sort=price_asc` — cards should be ordered lowest price first. Visit `/oripa?sort=stock_desc` — cards should be ordered highest stock first. Sort button for active option should appear highlighted.

### Implementation for User Story 1

- [x] T002 [US1] Add `sortPosts(posts: OripaPostSummary[], sort: SortOption): OripaPostSummary[]` to `apps/web/lib/posts.ts` — handles newest/price_asc/price_desc/stock_asc/stock_desc; undefined price/stock placed at end
- [x] T003 [US1] Update `pageUrl()` in `apps/web/app/oripa/page.tsx` to accept and preserve `sort` and `filter` params (reset `page` to 1 when not passed)
- [x] T004 [US1] Extend `searchParams` type in `apps/web/app/oripa/page.tsx` to include `sort?: string` and `filter?: string`; parse and validate `sort` with fallback to `'newest'`
- [x] T005 [US1] Apply `sortPosts()` in the processing pipeline in `apps/web/app/oripa/page.tsx` between `getTodayOnSalePosts()` and pagination slicing
- [x] T006 [US1] Create `apps/web/app/oripa/components/SortFilterToolbar.tsx` as a Server Component with props `{ currentSort, currentFilter, area }` — render sort button row (5 buttons: 新着順/価格 安→高/価格 高→安/在庫 少→多/在庫 多→少); each button is an `<a>` tag with correct href using `pageUrl()`-style param construction; active button gets `tabActive` CSS class
- [x] T007 [US1] Add `.toolbar` and `.toolbarSection` and `.toolbarLabel` CSS classes to `apps/web/app/oripa/oripa.module.css`; mobile breakpoint: flex-wrap wrap
- [x] T008 [US1] Render `<SortFilterToolbar>` in `apps/web/app/oripa/page.tsx` between area tabs and cards grid; pass `currentSort`, `currentFilter`, `area`

**Checkpoint**: User Story 1 is fully functional. Sort works, URL is updated, active button is highlighted. Verify at `/oripa?sort=price_asc`.

---

## Phase 3: User Story 2 — Filter Cards by Prize Information (Priority: P2)

**Goal**: Users can filter to only show cards with a last-one prize, hit card info, or both. Empty state is shown when no cards match.

**Independent Test**: Visit `/oripa?filter=hit_card` — only cards with `atariCards` non-empty should appear. Visit `/oripa?filter=both` — only cards with both `lastOnePrizeName` and `atariCards` populated should appear. If no cards match, an empty state message is shown.

### Implementation for User Story 2

- [x] T009 [US2] Add `filterPosts(posts: OripaPostSummary[], filter: FilterOption | undefined): OripaPostSummary[]` to `apps/web/lib/posts.ts` — last_one: `lastOnePrizeName` non-empty; hit_card: `atariCards` non-empty array; both: both conditions; undefined: return all
- [x] T010 [US2] Parse and validate `filter` param from `searchParams` in `apps/web/app/oripa/page.tsx` with fallback to `undefined` for invalid values
- [x] T011 [US2] Apply `filterPosts()` in the processing pipeline in `apps/web/app/oripa/page.tsx` after `sortPosts()` and before pagination; recalculate `totalPages` from filtered array length
- [x] T012 [US2] Add filter button row (4 buttons: すべて/ラストワンあり/あたり情報あり/両方あり) to `apps/web/app/oripa/components/SortFilterToolbar.tsx`; すべて button href omits filter param; active state for current filter
- [x] T013 [US2] Add empty state UI to `apps/web/app/oripa/page.tsx`: when `pageItems.length === 0`, show a message like "条件に一致するカードがありません" instead of the cards grid

**Checkpoint**: User Story 2 is fully functional. Filter works independently. Empty state appears when 0 results. Verify at `/oripa?filter=both`.

---

## Phase 4: User Story 3 — Combined Sort and Filter (Priority: P3)

**Goal**: Sort and filter work simultaneously. Changing one does not reset the other.

**Independent Test**: Visit `/oripa?sort=price_asc&filter=hit_card` — results should be filtered to hit-card cards AND sorted by price ascending. Changing only the sort param keeps the filter active.

### Implementation for User Story 3

- [x] T014 [US3] Verify that `pageUrl()`-style href construction in `SortFilterToolbar.tsx` preserves both `sort` and `filter` params independently when building links — sort buttons keep current filter in href; filter buttons keep current sort in href; no cross-reset

**Checkpoint**: All three user stories are functional together. Verify combined URL at `/oripa?sort=price_asc&filter=hit_card`.

---

## Phase 5: User Story 4 — Shareable and Bookmarkable State (Priority: P4)

**Goal**: URLs with sort/filter params restore the same view when opened in a new session. Invalid params fall back to defaults.

**Independent Test**: Copy `/oripa?sort=stock_asc&filter=last_one`, open in a new tab — page should load with those options active. Open `/oripa?sort=invalid&filter=garbage` — page should load in default state without error.

### Implementation for User Story 4

- [x] T015 [US4] Confirm invalid sort/filter values are handled: verify that the `VALID_SORTS.includes()` and `VALID_FILTERS.includes()` guard logic in `apps/web/app/oripa/page.tsx` falls back to defaults and does not throw or render an error state

**Checkpoint**: US4 is satisfied by the URL-param approach already implemented in US1/US2. This task is a verification that fallback logic is correct.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 Run `pnpm typecheck` — confirm no TypeScript errors across `apps/web/lib/posts.ts`, `apps/web/app/oripa/page.tsx`, and `apps/web/app/oripa/components/SortFilterToolbar.tsx`
- [x] T017 [P] Playwright screenshot — default view: toolbar visible, 新着順 and すべて active
- [x] T018 [P] Playwright screenshot — `?sort=price_asc` active: 価格 安→高 highlighted, verify card order
- [x] T019 [P] Playwright screenshot — `?filter=hit_card` active: あたり情報あり highlighted, only matching cards
- [x] T020 [P] Playwright screenshot — `?sort=price_asc&filter=both`: both buttons highlighted, combined result
- [x] T021 [P] Playwright screenshot — mobile viewport (375px wide): toolbar wraps correctly, buttons remain tappable
- [x] T022 Playwright screenshot — empty state: apply a filter that yields 0 cards; verify empty message is shown and no JS errors in console

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on T001 completion — BLOCKS on Foundational
- **US2 (Phase 3)**: Depends on T001 completion — BLOCKS on Foundational; can run in parallel with US1
- **US3 (Phase 4)**: Depends on US1 + US2 complete (T002–T013)
- **US4 (Phase 5)**: Depends on US1 (T003, T004) complete
- **Polish (Phase 6)**: Depends on all user stories complete

### Within US1 (sequential)

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008

Note: T003 and T004 can be done in parallel (different parts of page.tsx). T006 and T007 can be done in parallel (different files).

### Within US2 (sequential)

T001 (done) → T009 → T010 → T011 → T012 → T013

T010 and T011 can be done in parallel with T012 (different parts of page.tsx vs SortFilterToolbar.tsx).

### Parallel Opportunities

- T006 [sortPosts call in page.tsx] and T007 [CSS] and SortFilterToolbar creation can proceed in parallel once T003/T004 are done
- T017–T021 Playwright screenshots can run in parallel after T016 typecheck passes

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: T001
2. Complete Phase 2: T002–T008
3. **VALIDATE**: Visit `/oripa?sort=price_asc` and `/oripa?sort=stock_desc` — sort works ✓
4. Deploy if ready

### Full Feature (All Stories)

1. Phase 1 (T001) → Phase 2 US1 (T002–T008) → Phase 3 US2 (T009–T013)
2. Phase 4 US3 (T014) — quick verification pass
3. Phase 5 US4 (T015) — quick guard check
4. Phase 6 Polish (T016–T022) — typecheck + Playwright

---

## Notes

- No database changes required — all sort/filter is in-memory on the 60-item data set
- `SortFilterToolbar.tsx` is a Server Component — no `"use client"` directive
- Reuse existing `.tab` / `.tabActive` CSS classes from `oripa.module.css` for sort/filter buttons
- `pageUrl()` must always reset `page` to 1 when constructing sort/filter links
- Per project rule: Playwright screenshots MUST be taken before marking complete

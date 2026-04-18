# Tasks: Top Page Pagination

**Input**: Design documents from `/specs/011-top-page-pagination/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

- [x] T001 Increase `MAX_RESULTS` from `50` to `60` in `apps/web/lib/posts.ts`

---

## Phase 2: Foundational

**Purpose**: Core pagination logic in `apps/web/app/page.tsx` that all stories depend on.

- [x] T002 Add `page` to `searchParams` destructuring in `apps/web/app/page.tsx` (alongside existing `area`)
- [x] T003 Add `pageUrl(p, area?)` inline helper function in `apps/web/app/page.tsx` — builds `/?area=X&page=N` URL, omits `page` param when p=1, omits `area` when undefined
- [x] T004 Compute pagination constants and derived values in `apps/web/app/page.tsx`: `PAGE_SIZE=20`, `MAX_PAGES=3`, `pageIndex` (clamped 1–3), `pageItems` (sliced summaries), `totalPages`

**Checkpoint**: Foundation ready — US1, US2, US3 can now be implemented

---

## Phase 3: User Story 1 — Browse First Page of Results (P1) 🎯 MVP

**Goal**: Table shows at most 20 items; pagination controls appear when there are more.

**Independent Test**: Load top page with 21+ items → exactly 20 rows → 「次へ」 visible, 「前へ」 absent.

- [x] T005 [US1] Replace `summaries` with `pageItems` in the table render loop in `apps/web/app/page.tsx`
- [x] T006 [US1] Add pagination controls below the table in `apps/web/app/page.tsx` — `N / totalPages ページ` indicator + 「前へ」 link (hidden when `pageIndex === 1`) + 「次へ」 link (hidden when `pageIndex >= totalPages`)

**Checkpoint**: 20-item cap and controls work on page 1

---

## Phase 4: User Story 2 — Navigate Between Pages (P2)

**Goal**: 「前へ」/「次へ」 links update the URL and show the correct page's items.

**Independent Test**: With 21+ items, click 「次へ」 → URL becomes `?page=2` → items 21–40 shown → 「前へ」 appears.

- [x] T007 [US2] Verify `pageUrl` produces correct URLs for all combinations (p=1 omits page param, p=2/3 includes it, area preserved) — inspect output in browser at `?page=2` and `?page=3`
- [x] T008 [US2] Verify out-of-range inputs (`?page=0`, `?page=4`, `?page=abc`) render as page 1 in `apps/web/app/page.tsx` — confirm clamp logic from T004

**Checkpoint**: Multi-page navigation fully functional

---

## Phase 5: User Story 3 — Pagination Persists with Area Filter (P3)

**Goal**: `?area=X&page=N` shows correct filtered and paged results; changing area resets to page 1.

**Independent Test**: Load `?area=akihabara&page=2` → only akihabara items, items 21–40.

- [x] T009 [US3] Verify area nav links in `apps/web/app/page.tsx` still point to `/?area=X` (no page param) so changing area resets to page 1 — no code change needed if already correct, just confirm
- [ ] T010 [US3] Verify `pageUrl` includes `area` param when area is set — manual test at `?area=akihabara&page=2`

**Checkpoint**: All three user stories functional

---

## Phase 6: Polish & Verification

- [ ] T011 [P] Take Playwright screenshot of top page (page 1) — confirm 20 rows, pagination controls visible
- [ ] T012 [P] Take Playwright screenshot of `?page=2` — confirm items 21–40 shown, both nav controls
- [ ] T013 [P] Take Playwright screenshot of `?area=akihabara&page=2` — confirm filtered + paged

---

## Dependencies & Execution Order

- T001 → T002 → T003 → T004 (sequential, all in setup/foundational)
- T005, T006 depend on T004
- T007, T008 depend on T005+T006
- T009, T010 depend on T007+T008
- T011, T012, T013 can run in parallel after T010

---

## Implementation Strategy

### MVP (User Story 1 — 6 tasks)

T001 → T002 → T003 → T004 → T005 → T006 → T011

### Full delivery

Add T007–T010 (edge cases + area filter verification), then T012–T013 (screenshots).

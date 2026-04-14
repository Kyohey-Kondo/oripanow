# Tasks: Area Filter on Top Page

**Input**: Design documents from `specs/008-area-filter-top-page/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Note**: This feature touches exactly 2 files. No new dependencies, no schema changes, no CDK deploy.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

**Purpose**: Confirm no setup work needed — no new packages, no new files, no migrations.

- [x] T001 Verify existing `AREAS` constant in `apps/web/lib/posts.ts` matches `akihabara | kawagoe | omiya | urawamisono`

---

## Phase 2: User Story 1 — Filter Posts by Area (Priority: P1) 🎯 MVP

**Goal**: Add `area?` param to `getTodayOnSalePosts` and render area filter buttons on the top page.

**Independent Test**: Navigate to `/?area=akihabara` — only akihabara posts shown; Akihabara button visually active.

### Implementation

- [x] T002 [P] [US1] Add optional `area?: string` param to `getTodayOnSalePosts` in `apps/web/lib/posts.ts` — narrow `areasToQuery` to `[area]` when valid, else keep `AREAS`
- [x] T003 [P] [US1] Update `HomePage` signature in `apps/web/app/page.tsx` to accept `searchParams: Promise<{ area?: string }>` and await it
- [x] T004 [US1] Add `AREA_LABELS` constant in `apps/web/app/page.tsx`: `{ akihabara: '秋葉原', kawagoe: '川越', omiya: '大宮', urawamisono: '浦和美園' }`
- [x] T005 [US1] Render `<nav>` area filter bar in `apps/web/app/page.tsx` — "すべて" links to `/`; each area key links to `/?area={key}`; active button (`area === key` or no area for すべて) styled with dark background
- [x] T006 [US1] Pass awaited `area` value to `getTodayOnSalePosts(area)` call in `apps/web/app/page.tsx`

**Checkpoint**: `pnpm --filter @oripa-now/web dev` → verify filter bar renders and clicking an area updates the list.

---

## Phase 3: User Story 2 — Share Filtered URL (Priority: P2)

**Goal**: Confirm filtered URL is shareable and produces same view when opened directly (zero extra implementation — delivered by US1).

**Independent Test**: Open `/?area=omiya` in a fresh tab — only omiya posts shown, Omiya button active.

- [x] T007 [US2] Manual verification: open `/?area=omiya` in a new browser tab and confirm filtered view renders correctly (no code change needed — delivered by US1)

**Checkpoint**: All 4 areas + "All" navigatable by URL.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T008 Run `pnpm typecheck` and confirm zero errors
- [x] T009 Run `pnpm lint` and confirm zero warnings — pre-existing `eslint: command not found` env issue, not caused by this change
- [ ] T010 Run quickstart.md verification steps (5 scenarios) against `http://localhost:3000`

---

## Dependencies & Execution Order

- **T002 and T003** can run in parallel (different files)
- **T004 and T005 and T006** must follow T003 (same file, sequential)
- **T007** requires T002–T006 complete
- **T008–T010** require all implementation complete

### Parallel Opportunities

```bash
# T002 and T003 in parallel:
Task: "Add area? param to getTodayOnSalePosts in apps/web/lib/posts.ts"
Task: "Update HomePage signature to accept searchParams in apps/web/app/page.tsx"
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. T001 — verify AREAS constant
2. T002 + T003 in parallel
3. T004 → T005 → T006 sequentially
4. Validate: `pnpm --filter @oripa-now/web dev` + quickstart scenarios

### Full Delivery

MVP delivers both US1 and US2 (US2 is a zero-cost byproduct of URL-based navigation).

---

## Notes

- No `"use client"` directive — page stays a Server Component
- Active button style: `background: #333; color: #fff` (inactive: `background: #eee; color: #333`)
- Unknown or empty `?area=` value → fallback to showing all areas (no error)
- `AREA_LABELS` keys must exactly match `AREAS` tuple in `posts.ts`

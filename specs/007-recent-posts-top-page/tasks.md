# Tasks: Recent On-Sale Posts on Top Page

**Input**: Design documents from `specs/007-recent-posts-top-page/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup

*No special setup needed — this feature modifies existing files within the established monorepo.*

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Extend the shared type so both the data layer and web layer can carry `saleAt`.

**⚠️ CRITICAL**: T001 must complete before any user story implementation begins — it unblocks the TypeScript build across all changed packages.

- [x] T001 Add `saleAt: string` field to `OripaPostSummary` interface in `packages/types/src/index.ts`

**Checkpoint**: `pnpm typecheck` passes (packages/types compiles; downstream packages may temporarily show type errors until T003 is done).

---

## Phase 3: User Story 1 — View Current Sale Status Per Store (Priority: P1) 🎯 MVP

**Goal**: The top page shows the most recent on-sale post per store from the last 14 days, instead of showing nothing on days with no fresh data.

**Independent Test**: Load the top page when today has no DynamoDB data — at least one store row must appear if any store has an `on_sale` post within the last 14 days.

### Implementation for User Story 1

- [x] T002 [US1] Add `getRecentDatesJST(days?: number): string[]` and `queryRecentOnSalePostsByArea(client, tableName, area, days?): Promise<OripaPostItem[]>` to `packages/db/queries/oripa-posts.ts`
- [x] T003 [US1] Update `mapToSummary` in `apps/web/lib/posts.ts` to include `saleAt: p.saleAt` in the mapped output (depends on T001)
- [x] T004 [US1] Update `getTodayOnSalePosts` in `apps/web/lib/posts.ts` to call `queryRecentOnSalePostsByArea` instead of `queryOnSalePostsByDate` + `getTodayJST` (depends on T002)
- [x] T005 [US1] Update test T-09 in `apps/web/lib/__tests__/posts.test.ts` to assert `summary.saleAt === "2026-04-13"` (depends on T003)

**Checkpoint**: `pnpm --filter @oripa-now/web test` passes; `pnpm typecheck` passes across the monorepo.

---

## Phase 4: User Story 2 — Understand Data Freshness (Priority: P2)

**Goal**: Each row on the top page displays the advertised sale date (`saleAt`) so users can judge how current the information is.

**Independent Test**: Each table row shows a "Sale Date" column with the `YYYY-MM-DD` value from the post, clearly distinct from the analysis timestamp.

### Implementation for User Story 2

- [x] T006 [US2] In `apps/web/app/page.tsx`: add `"Sale Date"` column header and `<td>{s.saleAt}</td>` cell; update page subtitle to `"Most recent available info per store — sorted by newest sale date"` (depends on T003, T004)

**Checkpoint**: Top page renders with a visible "Sale Date" column showing the sale date for each store row.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [x] T007 [P] Run `pnpm typecheck && pnpm lint && pnpm --filter @oripa-now/web test` from repo root and confirm all pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: T001 must be complete before T003; T002 must be complete before T004
- **US2 (Phase 4)**: T003 and T004 must be complete (US1 must be complete)
- **Polish (Phase 5)**: All implementation tasks complete

### Within User Story 1

```
T001 (types)
  ↓
T002 (db query)   T003 (mapToSummary, depends on T001)
  ↓                  ↓
T004 (orchestrator)  T005 (test update, depends on T003)
```

T002 and T003 can be worked in parallel (different files).

### Parallel Opportunities

```bash
# T002 and T003 touch different files — run in parallel:
Task T002: packages/db/queries/oripa-posts.ts
Task T003: apps/web/lib/posts.ts (mapToSummary only)
```

---

## Implementation Strategy

### MVP (User Story 1 only — 4 tasks)

1. Complete T001 (type change)
2. Complete T002 + T003 in parallel (query function + mapToSummary)
3. Complete T004 (orchestrator)
4. Complete T005 (test update)
5. **Validate**: `pnpm --filter @oripa-now/web test` passes; top page shows data

### Full Delivery (both user stories — 6 tasks + polish)

1. MVP above (T001–T005)
2. T006 (add Sale Date column to page)
3. T007 (typecheck + lint + test)

---

## Notes

- All changes are application-layer only — no DynamoDB schema, no CDK deploy required
- `getRecentDatesJST` and `queryRecentOnSalePostsByArea` in `packages/db` are pure / testable independently if a `packages/db` test suite is added later
- The existing pipeline functions (`sortNewestFirst`, `deduplicateByStore`, `capResults`) require no changes

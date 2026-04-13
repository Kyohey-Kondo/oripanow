# Tasks: Top Page — Stores with Same-Day Stock

**Input**: Design documents from `specs/004-top-page-stores/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Included — explicitly required by spec (FR-006: unit tests MUST be created).

**Organization**: Single user story (US1 — P2 per spec) with setup and foundational phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[US1]**: Browse Stores with Same-Day Stock (the only user story)

---

## Phase 1: Setup (Vitest Test Framework)

**Purpose**: Install and configure the unit test framework. No user story tasks can be tested without this.

- [x] T001 Add `vitest` and `@vitest/coverage-v8` to `devDependencies` in `apps/web/package.json`; add `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` scripts
- [x] T002 Create `apps/web/vitest.config.ts` with `test.environment = "node"` and `test.include = ["lib/**/__tests__/**/*.test.ts"]`
- [x] T003 Verify setup: run `pnpm --filter @oripa-now/web test` — should exit 0 with no test files found (not an error)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and the DynamoDB query function that US1 depends on. Must be complete before US1 implementation begins.

**⚠️ CRITICAL**: US1 implementation tasks cannot start until T004 and T005 are complete.

- [x] T004 Add `OripaPostSummary` interface to `packages/types/src/index.ts` (fields: `postId`, `storeId`, `storeName`, `createdAt`, `price?`, `stockCount?`) per `data-model.md`
- [x] T005 [P] Create `packages/db/queries/oripa-posts.ts` with `getTodayJST(): string` using `Intl.DateTimeFormat` with `timeZone: "Asia/Tokyo"` per `contracts/db-query.md`
- [x] T006 [P] Add `queryOnSalePostsByDate(client, tableName, area, dateJST, limit?)` to `packages/db/queries/oripa-posts.ts` using `QueryCommand` with GSI1, `begins_with(GSI1SK, :skPrefix)`, and `ScanIndexForward: false` per `contracts/db-query.md`
- [x] T007 Verify: `pnpm typecheck` passes with no errors

**Checkpoint**: Foundational types and DB query are ready — US1 implementation can begin.

---

## Phase 3: User Story 1 — Browse Stores with Same-Day Stock (Priority: P2) 🎯

**Goal**: Top page shows stores with same-day on-sale oripa stock, sorted newest-first, with empty-state when none available.

**Independent Test**: Open the top page (or run unit tests); the page must show stores with today's `on_sale` posts sorted by newest `createdAt` first, or display an empty-state message when no such posts exist. Unit tests must all pass.

### Tests for User Story 1 ⚠️

> **Write these tests FIRST, run `pnpm --filter @oripa-now/web test` and confirm they FAIL before implementing**

- [x] T008 [P] [US1] Create `apps/web/lib/__tests__/posts.test.ts` with test T-01: `sortNewestFirst` — two posts with different `createdAt`; assert newer appears at index 0
- [x] T009 [P] [US1] Add test T-02 to `apps/web/lib/__tests__/posts.test.ts`: `sortNewestFirst` with a single post — returns a one-element array
- [x] T010 [P] [US1] Add test T-03 to `apps/web/lib/__tests__/posts.test.ts`: `sortNewestFirst` with empty input — returns `[]`
- [x] T011 [P] [US1] Add test T-04 to `apps/web/lib/__tests__/posts.test.ts`: `deduplicateByStore` — two posts with same `storeId` (sorted newest-first) — returns only the first
- [x] T012 [P] [US1] Add test T-05 to `apps/web/lib/__tests__/posts.test.ts`: `deduplicateByStore` — two posts with different `storeId` — both returned
- [x] T013 [P] [US1] Add test T-06 to `apps/web/lib/__tests__/posts.test.ts`: `deduplicateByStore` with empty input — returns `[]`
- [x] T014 [P] [US1] Add test T-07 to `apps/web/lib/__tests__/posts.test.ts`: `capResults` — array of 5, limit 3 — returns first 3 elements
- [x] T015 [P] [US1] Add test T-08 to `apps/web/lib/__tests__/posts.test.ts`: `capResults` — array of 2, limit 50 — returns all 2
- [x] T016 [P] [US1] Add test T-09 to `apps/web/lib/__tests__/posts.test.ts`: `mapToSummary` — correctly maps `id→postId`, `storeId`, `storeName`, `createdAt`, `price`, `stockCount` fields
- [x] T017 [US1] Add test T-10 to `apps/web/lib/__tests__/posts.test.ts`: pipeline empty-state — `mapToSummary(capResults(deduplicateByStore(sortNewestFirst([])), 50))` returns `[]`
- [x] T018 [US1] Confirm all 10 tests FAIL: run `pnpm --filter @oripa-now/web test` — expected output is 10 failing tests

### Implementation for User Story 1

- [x] T019 [US1] Create `apps/web/lib/posts.ts`; define constants `AREAS = ["tokyo", "omiya"]` and `MAX_RESULTS = 50`; implement `sortNewestFirst(posts: OripaPostItem[]): OripaPostItem[]` — sort by `createdAt` descending (new array, no mutation)
- [x] T020 [US1] Add `deduplicateByStore(posts: OripaPostItem[]): OripaPostItem[]` to `apps/web/lib/posts.ts` — single O(n) pass using `Set<string>` on `storeId`; assumes input is sorted newest-first
- [x] T021 [US1] Add `capResults(posts: OripaPostItem[], limit: number): OripaPostItem[]` to `apps/web/lib/posts.ts` — returns `posts.slice(0, limit)`
- [x] T022 [US1] Add `mapToSummary(posts: OripaPostItem[]): OripaPostSummary[]` to `apps/web/lib/posts.ts` — maps `id→postId`, `storeId`, `storeName`, `createdAt`, `price`, `stockCount`; imports `OripaPostSummary` from `@oripa-now/types`
- [x] T023 [US1] Add `getTodayOnSalePosts(): Promise<OripaPostSummary[]>` orchestrator to `apps/web/lib/posts.ts` — creates `DynamoDBClient` + `DynamoDBDocumentClient`, reads `TABLE_NAME` from `@oripa-now/db`, calls `queryOnSalePostsByDate` for each area via `Promise.all`, flats and applies `sortNewestFirst → deduplicateByStore → capResults(MAX_RESULTS) → mapToSummary`
- [x] T024 [US1] Confirm all 10 tests PASS: run `pnpm --filter @oripa-now/web test` — expected output is 10 passing tests (FR-006 satisfied)
- [x] T025 [US1] Update `apps/web/app/page.tsx`: remove `STUB_ORIPA_POSTS` import; import `getTodayOnSalePosts` from `../lib/posts`; call `const summaries = await getTodayOnSalePosts()` inside the async Server Component; render table rows from `summaries` showing `storeName` and formatted `createdAt`; keep empty-state message and `export const dynamic = 'force-dynamic'`
- [x] T026 [US1] Verify page renders: run `pnpm --filter @oripa-now/web dev` and open `http://localhost:3000` — either the store table or the empty-state message displays without a runtime error

**Checkpoint**: US1 is complete — top page shows real same-day on-sale stores newest-first, unit tests all pass, empty-state works.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T027 [P] Run `pnpm typecheck` — confirm zero TypeScript errors across all packages
- [-] T028 [P] Run `pnpm lint` — ESLint 未インストールのためスキップ
- [x] T029 [P] Run `pnpm --filter @oripa-now/web test -- --coverage` — confirm 100% function coverage on `apps/web/lib/posts.ts` pure functions
- [x] T030 Seed one `OripaPostItem` into DynamoDB (using the AWS CLI command in `quickstart.md`) and verify the top page displays it with the correct store name and timestamp

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS US1
- **US1 (Phase 3)**: Depends on Phase 2 completion
  - Tests (T008–T018): Can be written as soon as Phase 1 is done (test stubs don't need the implementation)
  - Implementation (T019–T026): Depends on Phase 2 completion
- **Polish (Phase 4)**: Depends on Phase 3 completion

### User Story Dependencies

- **US1 (P2)**: The only user story. No inter-story dependencies.

### Within US1

```
Phase 1 complete
      ↓
T004 (types) ──┐
T005 + T006    ├── T007 (typecheck) ──→ Phase 2 complete
(DB queries) ──┘
                     ↓
          T008–T017 (write all tests, can be done in parallel)
                     ↓
               T018 (confirm FAIL)
                     ↓
          T019→T020→T021→T022→T023 (sequential — same file posts.ts)
                     ↓
               T024 (confirm PASS)
                     ↓
               T025 (update page.tsx)
                     ↓
               T026 (manual verify)
```

---

## Parallel Execution Example: Phase 2 + US1 Tests

```
# After Phase 1 completes:

# Parallel — Foundational:
Task T004: Add OripaPostSummary to packages/types/src/index.ts
Task T005+T006: Create packages/db/queries/oripa-posts.ts (getTodayJST + queryOnSalePostsByDate)

# Once Phase 1 complete, tests can be started in parallel (they stub against non-existent functions):
Task T008: Write T-01 (sortNewestFirst - two posts)
Task T009: Write T-02 (sortNewestFirst - single post)
Task T010: Write T-03 (sortNewestFirst - empty)
Task T011: Write T-04 (deduplicateByStore - same storeId)
Task T012: Write T-05 (deduplicateByStore - different storeId)
Task T013: Write T-06 (deduplicateByStore - empty)
Task T014: Write T-07 (capResults - limit enforced)
Task T015: Write T-08 (capResults - under limit)
Task T016: Write T-09 (mapToSummary - field mapping)
Task T017: Write T-10 (pipeline empty-state)
```

---

## Implementation Strategy

### MVP (this feature IS the MVP)

1. Complete Phase 1: Vitest setup
2. Complete Phase 2: Types + DB query (CRITICAL — blocks US1)
3. Complete Phase 3: US1 tests → implementation → verify
4. **STOP and VALIDATE**: Run `pnpm --filter @oripa-now/web test` (all pass) + open top page in browser
5. Complete Phase 4: Polish (typecheck, lint, coverage, seed verify)

---

## Notes

- [P] tasks = different files with no shared dependencies, safe to parallelize
- Tests T008–T017 can be written in any order — they are all independent of each other
- `getTodayOnSalePosts()` (T023) is NOT unit-tested directly — it performs I/O. Unit tests cover only the pure functions it calls.
- If DynamoDB is unavailable locally, T026 can be verified against the deployed dev table (see `quickstart.md`)
- Commit after T018 (all tests failing — red) and again after T024 (all tests passing — green)

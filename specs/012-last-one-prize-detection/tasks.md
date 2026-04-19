# Tasks: Last One Prize Detection

**Input**: Design documents from `specs/012-last-one-prize-detection/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: No new project/package setup needed — this is an additive change to an existing monorepo.

- [x] T001 Rebuild packages after type changes: `pnpm build` at repo root to confirm zero TypeScript errors before writing any feature code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions that ALL downstream work depends on. Must be complete before any batch or web changes.

**⚠️ CRITICAL**: Batch (Phase 3) and Web (Phase 3) cannot start until T002–T004 are complete.

- [x] T002 [P] Add `lastOnePrizeName?: string` to `OripaPostItem` in `packages/db/schema/index.ts`
- [x] T003 [P] Add `lastOnePrizeName?: string` to `OripaPostSummary` in `packages/types/src/index.ts`
- [x] T004 Run `pnpm build` (or `pnpm typecheck`) at repo root to confirm both type changes compile cleanly

**Checkpoint**: Type definitions done — batch and web changes can now proceed.

---

## Phase 3: User Story 1 — Detect and Display Last One Prize (Priority: P1) 🎯 MVP

**Goal**: Tweets with a last one prize are analyzed, the prize name is stored in DynamoDB, and it appears in the UI on the top page and shop detail page.

**Independent Test**: Run `backfill.ts` + invoke `dev-oripa-now-analyze` Lambda, then reload `http://localhost:3000` and verify a post with a last one prize shows the prize name.

### Batch — Parse Layer

- [x] T005 [US1] Add `lastOnePrizeName?: string` to the `OripaItem` type in `apps/batch/src/parse.ts`
- [x] T006 [US1] Add `lastOnePrizeName` field to `TOOL.toolSpec.inputSchema.json.properties.items.items.properties` in `apps/batch/src/parse.ts` with a description that covers all known detection patterns:
  ```json
  "lastOnePrizeName": {
    "type": "string",
    "description": "Product name of the last-one prize for this oripa tier, if mentioned in the tweet. Detect any of these patterns: 'ラストワン賞', 'ラスト1賞', 'ラス1賞', 'last one賞', 'last one prize', 'ラストワン', '最後の1口は〇〇', '最後の一口'. Extract the prize product name (e.g. 'ピカチュウex SAR', 'リザードンex'). Omit this field entirely if no last-one prize is mentioned."
  }
  ```

### Batch — Save Layer

- [x] T007 [US1] Pass `lastOnePrizeName` from `tier` to `OripaPostItem` in `apps/batch/src/save.ts` using conditional spread (consistent with existing `price` / `stockCount` pattern):
  ```ts
  ...(tier.lastOnePrizeName ? { lastOnePrizeName: tier.lastOnePrizeName } : {}),
  ```

### Web — Top Page

- [x] T008 [US1] Display `lastOnePrizeName` in the oripa card on `apps/web/app/page.tsx` — add a conditional render below existing price/stock display. Read the file first to find the exact card render location.

### Web — Shop Detail Page

- [x] T009 [US1] Display `lastOnePrizeName` in the oripa card on `apps/web/app/shops/[storeId]/page.tsx` — same conditional render pattern as T008.

### Verification

- [x] T010 [US1] Run `pnpm typecheck` at repo root to confirm all type changes are consistent across packages
- [x] T011 [US1] Run `backfill.ts` + invoke `dev-oripa-now-analyze` Lambda, then reload `http://localhost:3000` and take a Playwright screenshot to verify a post with a last one prize shows the prize name in the UI

**Checkpoint**: US1 complete — last one prize names extracted, stored, and displayed end-to-end.

---

## Phase 4: User Story 2 — Filter / Highlight Posts with Last One Prize (Priority: P2)

**Goal**: Users can visually identify oripa listings with a last one prize at a glance; optionally filter to show only those listings.

**Independent Test**: Visit `http://localhost:3000` and confirm that oripa cards with a last one prize have a visible badge/highlight, and that a filter control (if added) correctly hides/shows posts.

**⚠️ Depends on Phase 3 (US1) being complete.**

### Web — Top Page

- [ ] T012 [US2] Add a visual badge (e.g. colored label "🏆 ラストワン賞あり") to cards that have `lastOnePrizeName` in `apps/web/app/page.tsx` — distinct from the inline text added in T008, this is a scan-friendly indicator
- [ ] T013 [US2] Add a "ラストワン賞あり" filter button to the area filter nav in `apps/web/app/page.tsx` that hides posts without `lastOnePrizeName` when active (client-side or via `searchParams`)

### Web — Shop Detail Page

- [ ] T014 [US2] Add the same visual badge to `apps/web/app/shops/[storeId]/page.tsx`

### Verification

- [ ] T015 [US2] Take a Playwright screenshot confirming badge visibility and filter behavior on `http://localhost:3000`

**Checkpoint**: US2 complete — last one prize posts are visually highlighted and filterable.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Confirm `pnpm build` (full Turborepo build) passes cleanly with no TypeScript errors
- [ ] T017 [P] Confirm `pnpm lint` passes across all workspaces
- [ ] T018 Verify old DynamoDB records (without `lastOnePrizeName`) render gracefully in the UI (undefined → no label shown)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS Phase 3 and 4**
- **Phase 3 (US1)**: Depends on Phase 2 — T005–T009 can run in parallel once T004 passes
- **Phase 4 (US2)**: Depends on Phase 3 completion
- **Phase 5 (Polish)**: Depends on all desired stories complete

### Within Phase 3

| Can run in parallel | Must be sequential |
|---|---|
| T005, T006 (parse.ts — but same file, so sequential) | T005 → T006 → T007 |
| T008, T009 (different files, parallel) | T007 → T010 → T011 |

### Within Phase 4

- T012, T013, T014 can start in parallel (different files)
- T015 after T012–T014

---

## Parallel Example: Phase 3

```
# After T004 (types compile):
Task A: T005 + T006 + T007  (parse.ts → save.ts, sequential)
Task B: T008                 (page.tsx, parallel with Task A)
Task C: T009                 ([storeId]/page.tsx, parallel with Task A)

# After T005–T009:
Task D: T010 + T011          (typecheck + E2E verify)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1 (T001)
2. Complete Phase 2 (T002–T004)
3. Complete Phase 3 (T005–T011)
4. **STOP and VALIDATE**: Prize names appearing in UI
5. Ship to prod if validation passes

### Incremental Delivery

1. Phase 1 + 2 → types consistent ✓
2. Phase 3 → prize names detected and displayed ✓ (MVP)
3. Phase 4 → filter/highlight ✓
4. Phase 5 → build/lint clean ✓

---

## Notes

- Detection patterns in T006 description are the key to coverage — ensure all variants are listed in the tool schema `description` field; Claude uses this to recognize phrasings
- No DynamoDB migration needed; `lastOnePrizeName` absent on old records is the correct state
- Use conditional spread `...(tier.lastOnePrizeName ? { ... } : {})` not `lastOnePrizeName: tier.lastOnePrizeName ?? undefined` to keep the attribute absent (not null) in DynamoDB

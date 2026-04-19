# Tasks: Atari Card Info

**Input**: Design documents from `specs/013-atari-card-info/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

- [x] T001 Run `pnpm typecheck` at repo root to confirm clean baseline before any changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions that ALL downstream work depends on. Must be complete before batch or web changes.

**⚠️ CRITICAL**: Phase 3 cannot start until T002–T004 are complete.

- [x] T002 [P] Add `atariCards?: string[]` to `OripaPostItem` in `packages/db/schema/index.ts`
- [x] T003 [P] Add `atariCards?: string[]` to `OripaPostSummary` in `packages/types/src/index.ts`
- [x] T004 Run `pnpm typecheck` at repo root to confirm both type changes compile cleanly

**Checkpoint**: Type definitions done — batch and web changes can now proceed in parallel.

---

## Phase 3: User Story 1 — Detect and Display Atari Cards (Priority: P1) 🎯 MVP

**Goal**: Tweets with atari card listings are analyzed, card names stored as a list in DynamoDB, and displayed in the UI on the top page and shop detail page.

**Independent Test**: Run `backfill-atari-cards.ts` + reload `http://localhost:3000` and confirm a post with atari cards shows the card names in the「あたり」column.

### Batch — Parse Layer

- [x] T005 [US1] Add `atariCards?: string[]` to the `OripaItem` type in `apps/batch/src/parse.ts`
- [x] T006 [US1] Add `atariCards` field to `TOOL.toolSpec.inputSchema.json.properties.items.items.properties` in `apps/batch/src/parse.ts` with detection patterns:
  ```json
  "atariCards": {
    "type": "array",
    "items": { "type": "string" },
    "description": "List of hit card names (あたりカード) for this oripa tier. Detect any of these patterns: 'あたり', '当たり', '封入あたり', '封入当たり', '確定あたり', '確定当たり', '大当たり', '豪華あたり', '封入内容'. Extract each card name as a separate string (e.g. ['ピカチュウex SAR', 'リザードンex SAR']). If atari cards are shared across all tiers in the tweet, copy the full list to every tier's entry. Omit this field entirely if no atari cards are mentioned."
  }
  ```

### Batch — Save Layer

- [x] T007 [US1] Pass `atariCards` from `tier` to `OripaPostItem` in `apps/batch/src/save.ts` using conditional spread:
  ```ts
  ...(tier.atariCards && tier.atariCards.length > 0 ? { atariCards: tier.atariCards } : {}),
  ```

### Web — Mapping Layer

- [x] T008 [US1] Add `atariCards` to `mapToSummary` in `apps/web/lib/posts.ts`:
  ```ts
  ...(p.atariCards && p.atariCards.length > 0 && { atariCards: p.atariCards }),
  ```

### Web — Top Page

- [x] T009 [US1] Add「あたり」column header and cell to the table in `apps/web/app/page.tsx`. Display up to 3 cards joined by ` / `, then `… (+N)` for overflow. Read the file first to find the exact insertion point (after the「ラストワン賞」column).

### Web — Shop Detail Page

- [x] T010 [US1] Add「あたり」column header and cell to the table in `apps/web/app/shops/[storeId]/page.tsx` using the same truncation pattern as T009.

### Batch — Backfill Script

- [x] T011 [US1] Create `scripts/backfill-atari-cards.ts` following the same pattern as `scripts/backfill-last-one-prize.ts`:
  - Scan tweets table (env var `LIMIT`, default 20)
  - Re-analyze each tweet with Bedrock
  - `UpdateItem` on oripa-posts where `atariCards` is detected (non-empty array)
  - Print `✓ postId → [card1, card2]` for each updated record

### Verification

- [x] T012 [US1] Run `pnpm typecheck` to confirm all changes are type-safe across packages
- [x] T013 [US1] Run `backfill-atari-cards.ts` with `LIMIT=100` against dev and confirm some posts are updated
- [x] T014 [US1] Reload `http://localhost:3000` and verify the「あたり」column shows card names where detected

**Checkpoint**: US1 complete — atari card names extracted, stored, and displayed end-to-end.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T015 [P] Run `pnpm build` at repo root to confirm full Turborepo build passes cleanly
- [x] T016 [P] Run `pnpm lint` to confirm no lint errors across all workspaces — eslint not installed (pre-existing env issue), skipped
- [x] T017 Verify old DynamoDB records (without `atariCards`) render `—` gracefully in the UI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS Phase 3**
- **Phase 3 (US1)**: T005–T008 can run in parallel once T004 passes; T009, T010, T011 also parallel
- **Phase 4 (Polish)**: Depends on Phase 3 completion

### Within Phase 3

| Can run in parallel | Must be sequential |
|---|---|
| T005 → T006 (same file, sequential) | T005 → T006 → T007 |
| T008, T009, T010, T011 (different files) | T007 → T012 → T013 → T014 |

---

## Parallel Example: Phase 3

```
# After T004 (types compile):
Task A: T005 → T006 → T007   (parse.ts → save.ts)
Task B: T008                  (posts.ts mapping)
Task C: T009                  (page.tsx top page)
Task D: T010                  ([storeId]/page.tsx)
Task E: T011                  (backfill script)

# After all complete:
Task F: T012 → T013 → T014   (typecheck → backfill → verify)
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. T001 — baseline check
2. T002–T004 — types
3. T005–T011 — batch + web implementation
4. T012–T014 — verify
5. **STOP and VALIDATE**: Atari cards visible in UI
6. Deploy if validated

### Incremental Delivery

1. Phase 1 + 2 → types consistent ✓
2. Phase 3 → atari cards detected and displayed ✓ (MVP)
3. Phase 4 → build/lint clean ✓

---

## Notes

- **Key lesson from 012**: Don't forget `apps/web/lib/posts.ts` (`mapToSummary`) — this was the cause of data not appearing in UI despite being in DynamoDB. T008 makes this explicit.
- Use conditional spread with length check: `tier.atariCards && tier.atariCards.length > 0` to avoid storing empty arrays in DynamoDB.
- Truncation helper for display: cards.length ≤ 3 → join with ` / `; else first 3 + ` … (+N)`.
- `[P]` tasks = different files, no shared dependencies.

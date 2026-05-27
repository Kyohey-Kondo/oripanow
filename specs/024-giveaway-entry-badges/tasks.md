# Tasks: Giveaway Entry Condition Badges

**Input**: Design documents from `/specs/024-giveaway-entry-badges/`
**Branch**: `024-giveaway-entry-badges`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: No new project initialization needed — existing monorepo structure used.

- [ ] T001 Verify branch is `024-giveaway-entry-badges` (already created)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add `EntryConditions` type to both shared packages — required by all downstream layers.

**⚠️ CRITICAL**: Batch and web changes both depend on these type definitions.

- [ ] T002 Add `EntryConditions` type and replace `conditions?: string` with `entryConditions?: EntryConditions` in `packages/db/schema/index.ts`
- [ ] T003 [P] Add `EntryConditions` interface and replace `conditions?: string` with `entryConditions?: EntryConditions` in `packages/types/src/index.ts`
- [ ] T004 Update `mapToGiveawaySummary()` in `apps/web/lib/giveaways.ts` to spread `entryConditions` instead of `conditions`

**Checkpoint**: `pnpm typecheck` passes after T002–T004

---

## Phase 3: User Story 1 — View Structured Entry Conditions at a Glance (Priority: P1) 🎯 MVP

**Goal**: Each giveaway card shows four condition badges with active/inactive visual state.

**Independent Test**: Navigate to `/giveaway` dev server, verify four badges render per card with correct active/inactive styling.

### Implementation for User Story 1

- [ ] T005 [US1] Add `ConditionBadges` sub-component and replace the `conditionsRow` plain-text render with badge UI in `apps/web/app/(public)/giveaway/components/GiveawayCard.tsx`
- [ ] T006 [P] [US1] Remove `.conditionsText`, add `.conditionBadgeGroup`, `.conditionBadge`, `.conditionBadgeActive`, `.conditionBadgeInactive` CSS classes in `apps/web/app/(public)/giveaway/giveaway.module.css`

**Checkpoint**: Dev server at `http://localhost:3000/giveaway` shows badge UI. Old records without `entryConditions` show no conditions row (no error).

---

## Phase 4: User Story 2 — Read Supplementary Condition Details (Priority: P2)

**Goal**: Supplementary note renders below badges when `note` field is present.

**Independent Test**: Mock a `GiveawayPostSummary` with `entryConditions.note` set and confirm note text appears below badges.

### Implementation for User Story 2

- [ ] T007 [US2] Add `.conditionNote` CSS class to `apps/web/app/(public)/giveaway/giveaway.module.css` (renders note below badge row)
- [ ] T008 [US2] Confirm `ConditionBadges` (T005) already renders `{ec.note && <span className={styles.conditionNote}>{ec.note}</span>}` — no additional component change needed if T005 includes it

**Checkpoint**: Note text appears below badge row when `note` is present; no note row when absent.

---

## Phase 5: User Story 3 — AI Extracts Structured Conditions (Priority: P3)

**Goal**: Batch analyzer stores structured `entryConditions` for new giveaway tweets.

**Independent Test**: Run batch on a sample tweet; confirm DynamoDB record has `entryConditions` object instead of `conditions` string.

### Implementation for User Story 3

- [ ] T009 [US3] Update `GiveawayAnalysisResult` type: replace `conditions?: string` → `entryConditions?: EntryConditions` in `apps/batch/src/parse-giveaway.ts`
- [ ] T010 [US3] Replace `conditions` string property with `entryConditions` object (4 required booleans + optional `note`) in Bedrock tool schema in `apps/batch/src/parse-giveaway.ts`
- [ ] T011 [US3] Update user prompt text in `apps/batch/src/parse-giveaway.ts` to instruct Claude to extract structured conditions
- [ ] T012 [US3] Replace `conditions` → `entryConditions` in `saveGiveawayPost()` in `apps/batch/src/save-giveaway.ts`, saving only when at least one boolean is true

**Checkpoint**: `pnpm typecheck` passes; batch layer has no references to old `conditions` field.

---

## Phase 6: Polish & Verification

- [ ] T013 Run `pnpm typecheck` across all workspaces — zero errors
- [ ] T014 Run `pnpm lint` — zero errors
- [ ] T015 [P] Take Playwright screenshot of `http://localhost:3000/giveaway` and confirm badge layout is correct
- [ ] T016 Inject test data with `entryConditions: { follow: true, repost: true, reply: false, other: false }` into dev DynamoDB and verify card renders correctly
- [ ] T017 Inject test data with `entryConditions: { follow: true, repost: false, reply: true, other: true, note: "ハッシュタグ #ポケカプレゼント を付けてリプライ" }` and verify note renders

---

## Dependencies & Execution Order

- **Phase 2** (T002–T004): Must complete before Phases 3, 4, 5
- **Phase 3 & 4** (T005–T008): Can run in parallel with Phase 5 (different files)
- **Phase 5** (T009–T012): Independent of Phase 3/4 (batch layer only)
- **Phase 6** (T013–T017): Requires all prior phases complete

### Parallel Opportunities

```
Phase 2: T002 + T003 can run in parallel (different package files)
Phase 3: T005 + T006 can run in parallel (component + CSS)
Phase 3+4: T006 + T007 can be done together in one CSS edit
Phase 3+5: T005-T008 and T009-T012 can run in parallel (web vs batch)
```

---

## Implementation Strategy

### MVP (User Stories 1 + 2 — UI only)

1. Complete Phase 2: Add types (T002–T004)
2. Complete Phases 3+4: Badge UI + note CSS (T005–T008)
3. Verify with Playwright (T013–T015)
4. → UI is shippable; batch analyzer update follows independently

### Full Delivery

1. MVP above +
2. Phase 5: Batch AI extraction (T009–T012)
3. Full Phase 6 verification with real DynamoDB data

# Tasks: Shop Detail Page Google Map

**Input**: Design documents from `specs/014-shop-google-map/`
**Branch**: `014-shop-google-map`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Extend `getShopPosts` to expose the `area` field — required by both user stories.

**⚠️ CRITICAL**: Must be complete before the page changes can be implemented.

- [x] T001 Add `area` to `ProjectionExpression` and return value of `getShopPosts` in `apps/web/lib/posts.ts`

**Checkpoint**: `getShopPosts` now returns `{ summaries, storeName, twitterUsername, area }`.

---

## Phase 2: User Story 1 — View Store Location on Map (Priority: P1) 🎯 MVP

**Goal**: Display an interactive Google Map above the oripa post table on every shop detail page.

**Independent Test**: Visit any shop detail page and confirm a Google Map appears above the table.

### Implementation

- [x] T002 [US1] Destructure `area` from `getShopPosts` result and add area-to-label mapping constant in `apps/web/app/oripa/shops/[storeId]/page.tsx`
- [x] T003 [US1] Build `mapUrl` from `storeName` + area label and render `<iframe>` above the table in `apps/web/app/oripa/shops/[storeId]/page.tsx`

**Checkpoint**: Shop detail page shows a Google Map above the post table. User Story 1 is fully functional.

---

## Phase 3: User Story 2 — Area Context in Search Query (Priority: P2)

**Goal**: Ensure the map search query includes the Japanese area label (e.g., "秋葉原") to improve location accuracy.

**Independent Test**: Inspect the iframe `src` attribute and confirm it contains both the store name and the area label.

### Implementation

- [x] T004 [US2] Verify area-to-label mapping covers all active area codes (`akihabara`, `omiya`, `kawagoe`, `urawamisono`, `tokyo`) and add fallback for unknown codes in `apps/web/app/oripa/shops/[storeId]/page.tsx`

**Checkpoint**: Map query includes area label for all known area codes. User Story 2 is verified.

---

## Phase 4: Polish & Verification

**Purpose**: Type safety and visual validation per CLAUDE.md requirements.

- [x] T005 Run `pnpm typecheck` and fix any type errors introduced by the `area` return value change
- [x] T006 Verify UI with Playwright: take a screenshot of the shop detail page and confirm the map renders above the table

---

## Dependencies & Execution Order

- **T001** (Foundational): No dependencies — start here
- **T002**: Depends on T001
- **T003**: Depends on T002
- **T004**: Depends on T003 (same file, verifies area mapping completeness)
- **T005**: Depends on T001 (typecheck affected by return type change)
- **T006**: Depends on T003 (page must render the iframe first)

### Parallel Opportunities

T005 (typecheck) can run in parallel with T002–T004 once T001 is complete.

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete T001 (extend `getShopPosts`)
2. Complete T002–T003 (add iframe to page)
3. **STOP and VALIDATE**: visit shop page, confirm map appears
4. Run T005 + T006

### Incremental

1. T001 → T002 → T003 → validate US1
2. T004 → validate US2
3. T005 + T006 → polish complete

---

## Notes

- No DynamoDB schema changes required
- No new dependencies required — API-key-free embed URL
- Area label mapping lives only in the page component (no shared package needed)

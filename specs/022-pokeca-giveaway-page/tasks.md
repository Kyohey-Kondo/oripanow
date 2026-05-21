# Tasks: Pokémon Card Giveaway Campaign Page

**Input**: Design documents from `/specs/022-pokeca-giveaway-page/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript types, DynamoDB schema, and CDK infrastructure — blocking prerequisites for all phases.

- [ ] T001 Add `GiveawayTweetItem`, `GiveawayPostItem`, `GiveawayPrize` types and extend `TABLE_NAMES` / `GSI` constants in `packages/db/schema/index.ts`
- [ ] T002 Add `GiveawayPostSummary` and `GiveawayPrize` to `packages/types/src/index.ts`
- [ ] T003 Create `packages/db/queries/giveaway-posts.ts` — export `queryActiveGiveawaysForDateRange()` using GSI1 fan-out pattern
- [ ] T004 Add `{env}-giveaway-tweets` and `{env}-giveaway-posts` DynamoDB tables (with GSI1, GSI2) to `infra/cdk/lib/batch-stack.ts`
- [ ] T005 Add `fetch-giveaway` and `analyze-giveaway` Lambda functions with EventBridge schedules to `infra/cdk/lib/batch-stack.ts`
- [ ] T006 Grant `giveaway-posts` read permissions and set `GIVEAWAY_POSTS_TABLE_NAME` env var on the Next.js Lambda in `infra/cdk/lib/web-stack.ts`
- [ ] T007 Run `pnpm typecheck` to verify all type additions compile cleanly

**Checkpoint**: Infrastructure types and CDK definitions are complete; no runtime code yet.

---

## Phase 2: Foundational — Batch Pipeline

**Purpose**: The tweet fetch + AI analysis pipeline that populates `giveaway-posts`. Must be complete before the frontend page can show real data.

**⚠️ CRITICAL**: Frontend development (Phase 3+) can use empty-state UI before this phase, but real data requires this pipeline.

- [ ] T008 Create `apps/batch/src/parse-giveaway.ts` — define `classify_giveaway_tweet` Bedrock tool schema and export `analyzeGiveawayTweet(client, tweet, todayJST)` mirroring `parse.ts`
- [ ] T009 Create `apps/batch/src/save-giveaway.ts` — implement `saveGiveawayTweets()`, `saveGiveawayPost()`, `markGiveawayTweetProcessed()` with `attribute_not_exists` idempotency and sentinel logic for unknown deadlines
- [ ] T010 Create `apps/batch/src/fetch-giveaway.ts` — implement Strategy A (per-store `from:{username}` query) and Strategy B (broad keyword search), dedup by `tweetId`, write to `giveaway-tweets` table; manage search cursor via `GIVEAWAY_SEARCH_CURSOR` DynamoDB item
- [ ] T011 Create `apps/batch/src/analyze-giveaway.ts` — Lambda handler: query GSI2 for `UNPROCESSED` tweets (batch=50), call `analyzeGiveawayTweet()`, save or skip, mark processed, invalidate CloudFront `/giveaway*`
- [ ] T012 Run `pnpm typecheck` and `pnpm build` across all workspaces to verify batch pipeline compiles

**Checkpoint**: Pipeline can be manually invoked via Lambda console to seed `giveaway-posts` with real data.

---

## Phase 3: User Story 1 — Browse Active Giveaways (P1) 🎯 MVP

**Goal**: A visitor can open `/giveaway` and see all active Pokémon card giveaway campaigns with prize, conditions, and deadline.

**Independent Test**: Run dev server, visit `http://localhost:3000/giveaway` — giveaway cards are displayed (or empty state if no data).

- [ ] T013 Create `apps/web/lib/giveaways.ts` — implement `getActiveGiveaways()`, `mapToGiveawaySummary()`, `sortGiveaways()`, `filterGiveaways()` using `queryActiveGiveawaysForDateRange()`
- [ ] T014 Create `apps/web/app/giveaway/giveaway.module.css` — styles for GiveawayCard (color bars, prize type badges, deadline badges, conditions row); follow `oripa.module.css` palette
- [ ] T015 [P] Create `apps/web/app/giveaway/components/GiveawayCard.tsx` — displays prize list (type badge + name + winner count), conditions, deadline with days-remaining badge, tweet link button
- [ ] T016 Create `apps/web/app/giveaway/page.tsx` — Server Component with `dynamic = 'force-dynamic'`, calls `getActiveGiveaways()`, renders GiveawayCard grid, includes metadata (title/description)
- [ ] T017 Verify UI with Playwright: `pnpm --filter @oripa-now/web dev`, navigate to `/giveaway`, take screenshot, confirm empty state message and page layout

**Checkpoint**: `/giveaway` page renders correctly with empty state and card layout. User Story 1 is independently testable.

---

## Phase 4: User Story 2 — Filter by Prize Type (P2)

**Goal**: Visitors can filter the giveaway list to show only BOX prizes or only single card prizes.

**Independent Test**: On `/giveaway`, click "BOXのみ" — only BOX giveaway cards remain visible.

- [ ] T018 Create `apps/web/app/giveaway/components/GiveawaySortFilterToolbar.tsx` — filter buttons (すべて / BOXのみ / シングルのみ) and sort buttons (締め切り順 / 新着順); follows `SortFilterToolbar.tsx` pattern
- [ ] T019 Wire `searchParams` for `filter` and `sort` into `apps/web/app/giveaway/page.tsx` — pass to `filterGiveaways()` and `sortGiveaways()` in `apps/web/lib/giveaways.ts`
- [ ] T020 Verify with Playwright: filter "BOXのみ" shows only box cards; filter "シングルのみ" shows only single cards; "すべて" restores full list

**Checkpoint**: Filter UI works correctly for all prize type options.

---

## Phase 5: User Story 3 — Sort by Deadline (P2)

**Goal**: Giveaways with the soonest deadline appear at the top by default; unknown-deadline items appear at the bottom.

**Independent Test**: With multiple test giveaway records, verify the default order is deadline ascending, and "新着順" switches to newest-first.

- [ ] T021 Verify `sortGiveaways()` in `apps/web/lib/giveaways.ts` handles `deadline_asc` (soonest first, unknown last) and `newest` (by `createdAt` desc) correctly
- [ ] T022 Verify with Playwright: default page order is deadline ascending; selecting "新着順" reorders correctly

**Checkpoint**: Sort behavior matches spec for all cases including unknown deadlines.

---

## Phase 6: User Story 4 — Navigate to Original Tweet (P3)

**Goal**: Each giveaway card has a working link to the original tweet.

**Independent Test**: Click the tweet link on a card — original tweet opens in a new tab.

- [ ] T023 Verify `GiveawayCard.tsx` constructs the correct tweet URL (`https://x.com/{twitterUsername}/status/{tweetId}`) and opens in `target="_blank"` with `rel="noopener noreferrer"`

**Checkpoint**: All tweet links are correct and functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T024 [P] Add `/giveaway` navigation link to `apps/web/app/components/Footer.tsx`
- [ ] T025 [P] Add `GIVEAWAY_POSTS_TABLE_NAME` env var to `apps/web/.env.local` (for local dev) and document in `infra/cdk/.env.example`
- [ ] T026 Run final `pnpm typecheck && pnpm build` — all workspaces must pass
- [ ] T027 Update `specs/022-pokeca-giveaway-page/checklists/requirements.md` — mark all items `[X]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Batch)**: Requires Phase 1 complete (types needed)
- **Phase 3 (US1 Browse)**: Requires Phase 1 complete; Phase 2 needed for live data but page works with empty state
- **Phase 4 (US2 Filter)**: Requires Phase 3 complete
- **Phase 5 (US3 Sort)**: Can run parallel to Phase 4 (different code)
- **Phase 6 (US4 Tweet Link)**: Requires Phase 3 complete (card component)
- **Phase 7 (Polish)**: After all user stories

### Parallel Opportunities

```bash
# Phase 1 — all parallelizable:
T001  T002  T003  T004  T005  T006

# Phase 2 — partially parallel:
T008 [P] T009 [P]   # parse + save can be written together
T010                # after T008, T009
T011                # after T010

# Phase 3 — T015 is parallel with T014:
T013 → T014+T015 [P] → T016 → T017

# Phases 4, 5, 6 can run in parallel after Phase 3
```

---

## Implementation Strategy

### MVP First (User Story 1 — Browse)

1. Complete Phase 1 (Setup)
2. Complete Phase 3 (Browse page — works with empty state)
3. Complete Phase 2 (Batch pipeline — adds live data)
4. **STOP and VALIDATE** with Playwright screenshot
5. Deploy to staging

### Incremental Delivery

1. Setup (Phase 1) → types + infra ready
2. US1 Browse (Phase 3) → page with empty state
3. Batch Pipeline (Phase 2) → live data appears
4. US2 Filter (Phase 4) → filter by prize type
5. US3 Sort (Phase 5) → deadline sort
6. US4 Tweet Link (Phase 6) → navigation
7. Polish (Phase 7) → footer link, env vars, final build

---

## Notes

- [P] tasks = different files, no dependencies on each other
- Sentinel `"active#9999-12-31"` for unknown deadlines must be handled in T009 (save) and T013 (query mapping)
- Playwright screenshot is required per CLAUDE.md UI Development Rules
- `pnpm typecheck` must pass after each phase

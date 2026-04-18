# Tasks: Shop Detail Page

**Input**: Design documents from `/specs/010-shop-detail-page/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (No new infrastructure needed)

**Purpose**: This feature adds to existing infrastructure. No new project setup required.

- [x] T001 Create `apps/web/app/shops/[storeId]/` directory structure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: New DynamoDB query and data fetcher that both the shop page and link require.

- [x] T002 Add `queryRecentPostsByStore(client, tableName, storeId, days)` to `packages/db/queries/oripa-posts.ts` — queries GSI2 (`storeId → createdAt`), `ScanIndexForward: false`, last 14 days
- [x] T003 Add `getShopPosts(storeId)` to `apps/web/lib/posts.ts` — calls `queryRecentPostsByStore`, does GetItem on `stores` table for `twitterUsername`/`name`, runs existing pipeline (`sortNewestFirst` → `deduplicateByPriceAndStock` → `capResults` → `mapToSummary`)

**Checkpoint**: Foundation ready — shop page and top page link can now be implemented

---

## Phase 3: User Story 1 — Navigate to Shop Detail Page (Priority: P1) 🎯 MVP

**Goal**: Shop name on top page is a clickable link; shop detail page shows only that shop's posts.

**Independent Test**: Click any store name on the top page → navigates to `/shops/<storeId>` → table shows only that store's rows.

- [x] T004 [US1] Create `apps/web/app/shops/[storeId]/page.tsx` — `force-dynamic`, calls `getShopPosts(params.storeId)`, renders same table layout as top page (reuse `../../page.module.css`), heading shows store name, empty state message `この店舗の直近14日間の情報はありません。`, back link `← トップへ戻る` pointing to `/`
- [x] T005 [P] [US1] Update store name cell in `apps/web/app/page.tsx` — wrap truncated store name in `<a href={'/shops/' + s.storeId}>` with `textDecoration: 'none', color: 'inherit'`

**Checkpoint**: User Story 1 fully functional — store name links work, shop detail page renders correct data

---

## Phase 4: User Story 2 — Tweet Previews on Shop Detail Page (Priority: P2)

**Goal**: Shop detail page shows up to 3 oEmbed tweet previews from that shop in the sidebar/strip.

**Independent Test**: Open any shop detail page → right sidebar (desktop) / top strip (mobile) shows tweet preview cards from that shop only.

- [x] T006 [US2] Add oEmbed fetch logic to `apps/web/app/shops/[storeId]/page.tsx` — reuse existing `fetchOEmbed` pattern (top 3 unique tweets from `summaries`, parallel fetch, `oEmbeds.some(Boolean)` guard), render `<aside className={styles.tweetSidebar}>` with `<Script src="https://platform.twitter.com/widgets.js" />`

**Checkpoint**: User Stories 1 AND 2 functional — shop page has full two-column layout with tweet previews

---

## Phase 5: User Story 3 — Return to Top Page (Priority: P3)

**Goal**: A visible back link on the shop detail page returns the user to `/`.

**Independent Test**: Open any shop detail page → "← トップへ戻る" link is visible → click returns to `/`.

- [x] T007 [US3] Verify back link `← トップへ戻る` is present in `apps/web/app/shops/[storeId]/page.tsx` heading area (already included in T004; mark complete after T004 is done and link is confirmed)

**Checkpoint**: All user stories functional

---

## Phase 6: Polish & Verification

- [x] T008 [P] Take Playwright screenshot of top page — confirm store name cells are links
- [x] T009 [P] Take Playwright screenshot of `/shops/<storeId>` — confirm layout, heading, table, tweet sidebar
- [x] T010 [P] Take Playwright screenshot at mobile viewport (375px) — confirm responsive layout

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
  - T002 and T003 must complete before T004/T005/T006
- **Phase 3 (US1)**: Depends on Phase 2 — T004 and T005 can run in parallel
- **Phase 4 (US2)**: Depends on Phase 3 (T004 must exist to add oEmbed)
- **Phase 5 (US3)**: Back link is part of T004 — verify only
- **Phase 6 (Polish)**: Depends on all story phases

### Parallel Opportunities

```bash
# Phase 2: sequential (T003 depends on T002)
T002 → T003

# Phase 3: parallel after T003
T004 (new page)   ← run in parallel
T005 (top page link)  ← run in parallel

# Phase 6: all screenshots in parallel
T008 + T009 + T010
```

---

## Implementation Strategy

### MVP (User Story 1 only — ~4 tasks)

1. T001: create directory
2. T002 → T003: foundational query + fetcher
3. T004 + T005: shop page + top page link
4. T008 + T009: screenshot verification

### Full delivery (all stories)

After MVP: add T006 (oEmbed sidebar), verify T007 (back link), run T010 (mobile screenshot).

---

## Notes

- No new CSS needed — `page.module.css` already has all responsive styles
- `fetchOEmbed` function can be extracted to a shared utility later, but for now copy to keep changes minimal
- `storeId` in the URL is a ULID — URL-safe, no encoding needed
- GSI2 already exists in DynamoDB — no infrastructure changes required

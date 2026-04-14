# Feature Specification: Recent On-Sale Posts on Top Page

**Feature Branch**: `007-recent-posts-top-page`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "直近の情報を全て見たい。今だと何も表示されないので、現時点での情報をリストするようにしたい。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Current Sale Status Per Store (Priority: P1)

A visitor opens the top page wanting to know which stores currently have oripa on sale. Even if no tweets were posted today, they see the most recent known sale status per store.

**Why this priority**: Core value proposition of the page — without this, the page is empty on most days.

**Independent Test**: Open the top page when no data exists for today. The page must display the most recent on-sale post for each store from within the last 14 days, one row per store.

**Acceptance Scenarios**:

1. **Given** no on-sale posts exist for today, **When** the top page is loaded, **Then** the most recent on-sale post per store from the last 14 days is displayed (one row per store).
2. **Given** both today and yesterday have on-sale posts for the same store, **When** the top page is loaded, **Then** only today's post is shown for that store (newest wins).
3. **Given** a store has no posts within the last 14 days, **When** the top page is loaded, **Then** that store does not appear in the list.

---

### User Story 2 - Understand How Fresh the Data Is (Priority: P2)

A visitor sees a row for a store and wants to know whether the information is from today or from several days ago, so they can judge how trustworthy the current stock status is.

**Why this priority**: Without a visible sale date, users cannot distinguish stale from fresh information.

**Independent Test**: Each row in the table displays a "Sale Date" column showing the date the store advertised the sale, distinct from when the tweet was analyzed.

**Acceptance Scenarios**:

1. **Given** a store's most recent post has `saleAt = 2026-04-10`, **When** the top page is loaded on 2026-04-14, **Then** the "Sale Date" column shows `2026-04-10`.
2. **Given** multiple stores with different sale dates are displayed, **When** the top page is loaded, **Then** each row shows its own sale date.

---

### Edge Cases

- What happens when all stores have no posts in the last 14 days? → Page displays the "No stores with available stock" message.
- What happens when a store has both `on_sale` and `sold_out` posts? → Only `on_sale` posts are queried; `sold_out` is excluded.
- What happens when two posts for the same store have the same `createdAt`? → Either one may be shown (stable sort not guaranteed; acceptable for this use case).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top page MUST query on-sale posts from the last 14 days (JST), not only today.
- **FR-002**: The page MUST display at most one row per store — the most recent on-sale post (by `createdAt` descending).
- **FR-003**: Each row MUST show the sale date (`saleAt`) so users can assess data freshness.
- **FR-004**: The overall result set MUST be capped at 50 rows maximum.
- **FR-005**: The page subtitle MUST communicate that results are "most recent available info per store" rather than "same-day only".
- **FR-006**: Existing display fields (store name, price, stock count) MUST be preserved.

### Key Entities

- **OripaPost**: Represents a parsed oripa sale event from a tweet. Key attributes: `storeId`, `storeName`, `status` (`on_sale`), `saleAt` (advertised sale date), `createdAt` (when analyzed), `price?`, `stockCount?`.
- **Store**: Referenced by `storeId`; area (`tokyo` / `omiya`) determines which query partition is used.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When no data exists for today, the top page displays results from within the last 14 days instead of an empty list.
- **SC-002**: Each store appears at most once in the result list (deduplication by store).
- **SC-003**: Each result row clearly shows the date the sale was advertised, allowing users to assess freshness at a glance.
- **SC-004**: Page load time remains comparable to the current implementation (parallel queries; no sequential blocking).

## Assumptions

- The 14-day lookback window is sufficient — stores that haven't posted in over 14 days are considered inactive and are excluded.
- Only `on_sale` status posts are shown; `sold_out` and `upcoming` posts are out of scope for the top page.
- Areas are fixed to `["tokyo", "omiya"]`; no area configuration change is needed.
- The existing `deduplicateByStore` / `sortNewestFirst` / `capResults` pure functions are reused without modification.
- No DynamoDB schema change (no new GSI) is needed; the existing GSI1 is queried once per (area, date) pair.

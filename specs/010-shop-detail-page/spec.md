# Feature Specification: Shop Detail Page

**Feature Branch**: `010-shop-detail-page`  
**Created**: 2026-04-18  
**Status**: Draft  
**Input**: User description: "ショップ名をリンクとし、クリックしたら該当のショップページに遷移するようにしたい。そのページではそのショップの情報のみが表示されるようにする。UIの基本構成はトップページと同じで良い。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navigate to Shop Detail Page (Priority: P1)

A user browsing the top page sees a list of shops with recent oripa sale information. They click on a shop name and are taken to a dedicated page showing only that shop's oripa posts, along with the most recent tweet previews from that shop.

**Why this priority**: Core navigation feature — without this, users cannot drill down into a specific shop's history.

**Independent Test**: Clicking any shop name link on the top page navigates to a shop-specific URL and displays only that shop's posts.

**Acceptance Scenarios**:

1. **Given** the top page is loaded with shop data, **When** the user clicks a shop name in the table, **Then** the browser navigates to `/shops/[storeId]` and shows only that shop's oripa posts.
2. **Given** the shop detail page is open, **When** the page loads, **Then** the page title and heading display the shop name.
3. **Given** the shop detail page is open, **When** the page loads, **Then** only posts from that specific shop are shown in the table.

---

### User Story 2 - View Shop's Recent Tweet Previews (Priority: P2)

On the shop detail page, users can see tweet preview cards from that shop (same sidebar/strip layout as the top page), showing only tweets from that shop.

**Why this priority**: Provides rich context about the shop's recent activity, consistent with the top page experience.

**Independent Test**: The shop detail page shows tweet previews in the sidebar/strip area sourced exclusively from the displayed shop.

**Acceptance Scenarios**:

1. **Given** the shop detail page is open, **When** the page loads, **Then** up to 3 recent tweet previews from that shop are displayed.
2. **Given** the shop has no recent tweets with embeds available, **When** the page loads, **Then** the sidebar/strip area is hidden and the table takes full width.

---

### User Story 3 - Return to Top Page (Priority: P3)

From the shop detail page, users can easily navigate back to the top page.

**Why this priority**: Basic navigation affordance; low effort, improves usability.

**Independent Test**: A back/top link on the shop detail page returns the user to the top page.

**Acceptance Scenarios**:

1. **Given** the shop detail page is open, **When** the user clicks the top page link, **Then** the browser navigates back to `/`.

---

### Edge Cases

- What happens when a `storeId` in the URL does not exist or has no posts? → Show a "No data found" message.
- What happens when a shop has no posts in the last 14 days? → Show an empty state message rather than an error.
- What if the shop name is very long? → Apply the same 20-character truncation as the top page table.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shop name in the top page table MUST be rendered as a clickable link.
- **FR-002**: Clicking the shop name link MUST navigate to a shop-specific URL (e.g., `/shops/[storeId]`).
- **FR-003**: The shop detail page MUST display only oripa posts belonging to the selected shop.
- **FR-004**: The shop detail page MUST display the shop name as the page heading.
- **FR-005**: The shop detail page layout MUST follow the same two-column structure as the top page (table on the left, tweet previews on the right/top).
- **FR-006**: The shop detail page MUST show up to 3 recent tweet preview embeds from that shop.
- **FR-007**: The shop detail page MUST include a link to return to the top page.
- **FR-008**: If no posts exist for the shop, the page MUST display an appropriate empty state message.

### Key Entities

- **Shop (Store)**: Identified by `storeId`. Has a name, Twitter username, and area. Used to scope the data shown on the detail page.
- **OripaPost**: Belongs to a shop via `storeId`. Queried via GSI2 (`storeId → createdAt`) for the shop detail page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every shop name in the top page table is a working link — 100% of rows have a navigable shop link.
- **SC-002**: The shop detail page loads and displays correctly within the same response time as the top page.
- **SC-003**: Only posts from the selected shop are shown — 0 posts from other shops appear on the detail page.
- **SC-004**: Users can reach a shop detail page and return to the top page in 2 clicks or fewer.

## Assumptions

- The shop detail page queries posts via GSI2 on the `oripa-posts` table (`storeId → createdAt`), which already exists.
- The top page passes the `storeId` (not the store name) in the URL to ensure uniqueness, since store names may not be URL-safe.
- The same 14-day lookback window used on the top page is also applied on the shop detail page.
- The existing `queryRecentOnSalePostsByArea` query is replaced by a store-specific query (`queryRecentPostsByStore`) using GSI2.
- Area filter is not applicable on the shop detail page (a shop belongs to one area only).
- The page is server-side rendered with `force-dynamic` consistent with the top page.

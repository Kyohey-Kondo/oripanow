# Feature Specification: Top Page — Stores with Same-Day Stock (Latest First)

**Feature Branch**: `004-top-page-stores`  
**Created**: 2026-04-12  
**Status**: Draft  
**Input**: User description: "P2から実装していこう。トップページ、当日在庫あり店舗、新着順で情報が見れるようにしよう。ユニットテストは必ず作成しよう"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Stores with Same-Day Stock (Priority: P2)

A visitor opens the top page and sees a list of stores that currently have oripa packs available today. The list is sorted newest-first, so freshly restocked stores appear at the top. The visitor can quickly scan which stores have live stock without navigating anywhere else.

**Why this priority**: This is the core P2 deliverable specified by the user. It is the primary value proposition of the top page — surfacing real-time stock availability at a glance.

**Independent Test**: Open the top page. Verify the list shows only stores whose stock is marked as available today, in descending order of most-recent update. Delivers clear value as a standalone feature.

**Acceptance Scenarios**:

1. **Given** at least one store has same-day available stock, **When** a visitor opens the top page, **Then** those stores are displayed, sorted newest-first (most recently updated first).
2. **Given** no stores have same-day available stock, **When** a visitor opens the top page, **Then** an empty-state message is shown (e.g., "No stores with available stock today").
3. **Given** multiple stores have same-day stock updated at different times, **When** the top page is loaded, **Then** the store updated most recently appears at the top of the list.
4. **Given** a store's same-day stock availability changes to unavailable, **When** the page is next loaded, **Then** that store no longer appears in the list.

---

### Edge Cases

- What happens when the same store has multiple same-day stock entries — only the latest should appear once.
- How does the system handle the date boundary (midnight turnover) — stores that had stock yesterday but not today must be excluded.
- What happens if the data feed is temporarily unavailable — the page should display the last known data with an appropriate notice, or show an empty state rather than an error page.
- What if a very large number of stores all have same-day stock — results should be paginated or capped at a reasonable limit (e.g., 50 stores) to maintain page performance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top page MUST display a list of stores that have oripa pack stock marked as available on the current calendar date.
- **FR-002**: The store list MUST be sorted in descending order by the time the stock information was last updated (newest first).
- **FR-003**: Each store entry MUST display at minimum: store name and the time of the most recent stock update.
- **FR-004**: If no stores have same-day stock, the page MUST display a clear empty-state message rather than a blank section.
- **FR-005**: The page MUST refresh its data on each load (no stale cache that shows yesterday's results as today's).
- **FR-006**: The feature MUST include unit tests covering: same-day filtering logic, newest-first sort logic, and the empty-state condition.
- **FR-007**: Results MUST be capped at 50 stores per page load to protect against performance degradation.

### Key Entities

- **Store**: A physical or online retailer that sells oripa packs; identified by a unique ID and display name.
- **OripaPost**: A record of an oripa pack offering at a store, including availability status, sale date, and creation timestamp used for sorting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The top page loads and displays the store list in under 2 seconds under normal network conditions.
- **SC-002**: 100% of stores shown on the page have confirmed same-day stock availability (no false positives).
- **SC-003**: The newest-updated store always appears first in the list (verifiable by comparing displayed update times).
- **SC-004**: Unit test coverage for filtering and sorting logic reaches 100% of the defined test cases.
- **SC-005**: The empty-state message is displayed correctly when zero same-day stores exist (verifiable by test and manual check).

## Assumptions

- The current calendar date is determined by the server's timezone (Japan Standard Time, JST).
- "Same-day stock" means the store's oripa post has a sale date equal to today's date in JST and a status indicating availability.
- A store may have multiple oripa posts; the most recent one determines the store's position in the sort order.
- The top page is publicly accessible — no authentication is required to view the store list.
- Mobile responsiveness is expected but detailed mobile UX design is out of scope for this spec.
- Pagination is out of scope for P2; a hard cap of 50 results is sufficient for the initial release.
- Unit tests refer to automated tests that run without external dependencies (mocked data store).

# Feature Specification: Card Sort and Filter

**Feature Branch**: `019-card-sort-filter`
**Created**: 2026-05-07
**Status**: Draft
**Input**: User description: "ツイートの最近のものの順、価格順、ストック数順、これらの昇順降順でいこう。それに加えて、ラストワンあり、あたり情報あり、両方ありでフィルタする機能も"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sort Cards by Desired Order (Priority: P1)

A visitor browsing the oripa card listing page wants to control how cards are presented. They can choose a sort order — such as newest tweet first, lowest price first, or fewest in stock first — and the card list immediately reflects that order.

**Why this priority**: Sorting is the core feature of this spec. Without it, the rest (filtering) cannot be tested meaningfully in context.

**Independent Test**: Can be fully tested by visiting the card listing, selecting a sort option, and verifying that card order changes consistently without a full page reload.

**Acceptance Scenarios**:

1. **Given** the card listing is displayed, **When** the user selects "Newest" sort, **Then** cards are ordered from the most recently tweeted to the oldest.
2. **Given** the card listing is displayed, **When** the user selects "Price: Low → High", **Then** cards with the lowest price appear first; cards with no price are placed at the end.
3. **Given** the card listing is displayed, **When** the user selects "Price: High → Low", **Then** cards with the highest price appear first; cards with no price are placed at the end.
4. **Given** the card listing is displayed, **When** the user selects "Stock: Low → High", **Then** cards with the fewest stock appear first; cards with no stock count are placed at the end.
5. **Given** the card listing is displayed, **When** the user selects "Stock: High → Low", **Then** cards with the most stock appear first; cards with no stock count are placed at the end.
6. **Given** a sort option is selected, **When** the user navigates to a different area tab and returns, **Then** the selected sort option is preserved.

---

### User Story 2 - Filter Cards by Prize Information (Priority: P2)

A visitor wants to narrow down displayed cards to only those that contain specific prize information — last-one prize, hit card info, or both.

**Why this priority**: Filtering is a key discovery tool, letting users quickly find the most attractive listings.

**Independent Test**: Can be fully tested by selecting a filter option and verifying that only cards matching the criteria are shown; unmatched cards disappear.

**Acceptance Scenarios**:

1. **Given** the card listing is displayed, **When** the user selects "Last-One Prize only" filter, **Then** only cards that have a last-one prize name are shown.
2. **Given** the card listing is displayed, **When** the user selects "Hit Card Info only" filter, **Then** only cards that have at least one hit card entry are shown.
3. **Given** the card listing is displayed, **When** the user selects "Both (Last-One + Hit Card)" filter, **Then** only cards that have both a last-one prize name AND at least one hit card entry are shown.
4. **Given** the card listing is displayed, **When** no filter is applied, **Then** all cards are shown regardless of prize information.
5. **Given** a filter is active, **When** the user clears it, **Then** all cards reappear.

---

### User Story 3 - Combined Sort and Filter (Priority: P3)

A visitor uses both a sort order and a prize information filter simultaneously to see, for example, the cheapest cards that have hit card information.

**Why this priority**: Combination usage is the highest-value scenario but depends on both P1 and P2 being functional.

**Independent Test**: Can be tested independently by applying any sort and any filter at the same time and verifying the results respect both constraints.

**Acceptance Scenarios**:

1. **Given** a filter and a sort are both active, **When** the card list renders, **Then** only cards matching the filter are shown and they appear in the selected sort order.
2. **Given** a combined state is active, **When** the user changes the sort option, **Then** the filter remains unchanged and only the order updates.
3. **Given** a combined state is active, **When** the user changes the filter, **Then** the sort order remains unchanged and only the set of visible cards changes.

---

### User Story 4 - Shareable and Bookmarkable State (Priority: P4)

A user copies the URL while a specific sort/filter combination is active, shares it with a friend, and the friend lands on the same view.

**Why this priority**: Enhances usability but is not required for core functionality.

**Independent Test**: Can be tested by copying the URL with active sort/filter, opening it in a new browser tab, and verifying the same state is restored.

**Acceptance Scenarios**:

1. **Given** a sort and filter are active, **When** the user copies the URL, **Then** the URL encodes the current sort and filter parameters.
2. **Given** a URL with sort/filter parameters, **When** a user opens it, **Then** the page loads with those sort and filter options pre-selected.
3. **Given** an invalid or unknown sort/filter parameter in the URL, **When** the page loads, **Then** the default view is shown without error.

---

### Edge Cases

- What happens when all cards are filtered out? → An empty state message is shown instead of a blank list.
- What happens when price is missing on some cards and "Price: Low → High" is selected? → Cards with no price appear at the end of the sorted list.
- What happens when stock count is missing on some cards and a stock-based sort is selected? → Cards with no stock count appear at the end of the sorted list.
- How does sorting interact with pagination? → Sort and filter are applied before pagination; page resets to 1 when sort or filter changes.
- What happens when a filter leaves 0 results and the user is on page 2? → Page resets to 1 and the empty state is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The listing page MUST offer the following sort options: Newest (default), Price Low→High, Price High→Low, Stock Low→High, Stock High→Low.
- **FR-002**: Each sort option MUST have both ascending and descending variants except Newest (which is always descending by tweet recency).
- **FR-003**: Cards with missing price values MUST be placed at the end when sorted by price.
- **FR-004**: Cards with missing stock count values MUST be placed at the end when sorted by stock count.
- **FR-005**: The listing page MUST offer the following filter options: No filter (default), Last-One Prize only, Hit Card Info only, Both (Last-One + Hit Card).
- **FR-006**: Filters MUST be additive with sort — both constraints apply simultaneously.
- **FR-007**: When a filter results in zero cards, the system MUST display a meaningful empty state message.
- **FR-008**: The active sort and filter state MUST be reflected in the page URL as query parameters so that the URL is shareable and bookmarkable.
- **FR-009**: When sort or filter changes, pagination MUST reset to page 1.
- **FR-010**: Unknown or invalid sort/filter query parameters MUST fall back silently to defaults.
- **FR-011**: The selected sort and filter MUST persist when switching between area tabs.

### Key Entities

- **OripaPostSummary**: Represents a single oripa card posting. Key attributes for this feature: `price` (optional number), `stockCount` (optional number), `lastOnePrizeName` (optional string), `atariCards` (optional array). Sort and filter logic operates on these fields.
- **SortOption**: An enumerated value representing the active sort choice (e.g., newest, price_asc, price_desc, stock_asc, stock_desc).
- **FilterOption**: An enumerated value representing the active prize-info filter (e.g., none, last_one, hit_card, both).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can change the sort order and see the updated card list within 1 second without a full page reload.
- **SC-002**: Users can apply a prize information filter and see results update within 1 second.
- **SC-003**: 100% of sort+filter combinations produce a consistent and deterministic card ordering.
- **SC-004**: A URL with sort/filter parameters correctly restores the same view in a fresh browser session.
- **SC-005**: When no cards match the active filter, a clear empty state is visible rather than a blank page.

## Assumptions

- Sort and filter are applied client-side (or at the server render level) on the already-fetched list of cards; no additional database queries are needed.
- The maximum number of displayed cards (currently 60) is sufficient for client-side sort/filter without performance concerns.
- "Newest" refers to tweet recency (tweetId descending), consistent with the current default behavior.
- "Last-One Prize only" means `lastOnePrizeName` is a non-empty string.
- "Hit Card Info only" means `atariCards` is a non-empty array.
- The sort and filter controls will be placed near the top of the card listing, visible without scrolling.
- Mobile layout is in scope — controls should be compact on small screens.
- Only one sort option can be active at a time; only one filter option can be active at a time (no multi-select filter for v1).

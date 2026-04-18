# Feature Specification: Top Page Pagination

**Feature Branch**: `011-top-page-pagination`  
**Created**: 2026-04-18  
**Status**: Draft  
**Input**: User description: "トップページのテーブル表示のアイテムの件数を最大20件としてページネーションを実装したい。ページの最大は3ページ、つまり遡れるアイテムは最大60件として実装したい。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse First Page of Results (Priority: P1)

A user visits the top page and sees up to 20 items in the table. If there are more than 20 items, pagination controls are shown below the table.

**Why this priority**: The default view — every user lands here first. Limiting to 20 items reduces visual overload.

**Independent Test**: Load the top page with more than 20 available items → only 20 rows appear in the table → pagination controls are visible.

**Acceptance Scenarios**:

1. **Given** more than 20 posts are available, **When** the user loads the top page, **Then** exactly 20 rows are shown and page controls (「次へ」) appear.
2. **Given** 20 or fewer posts are available, **When** the user loads the top page, **Then** all rows are shown and no pagination controls appear.
3. **Given** the top page loads, **When** no page parameter is present in the URL, **Then** page 1 is shown by default.

---

### User Story 2 - Navigate Between Pages (Priority: P2)

A user on the top page clicks "次へ" to advance to page 2 or page 3, and "前へ" to go back. The URL reflects the current page so it can be bookmarked or shared.

**Why this priority**: Core pagination interaction — without navigation, the first page is all users can access.

**Independent Test**: With 21+ items available, click 「次へ」 → URL changes to `?page=2` → next 20 items are shown → 「前へ」 appears.

**Acceptance Scenarios**:

1. **Given** the user is on page 1, **When** they click 「次へ」, **Then** the URL updates to `?page=2` and the next 20 items are displayed.
2. **Given** the user is on page 2, **When** they click 「前へ」, **Then** the URL updates to `?page=1` and the previous 20 items are displayed.
3. **Given** the user is on page 3 (the last page), **When** the page loads, **Then** the 「次へ」 button is absent or disabled.
4. **Given** the user is on page 1, **When** the page loads, **Then** the 「前へ」 button is absent or disabled.
5. **Given** the user navigates directly to `?page=3`, **When** the page loads, **Then** items 41–60 are shown (or fewer if less than 60 total).

---

### User Story 3 - Pagination Persists with Area Filter (Priority: P3)

When the user has an area filter active (e.g., `?area=akihabara`), pagination works within that filtered result set.

**Why this priority**: Area filter is an existing feature; pagination must not break it.

**Independent Test**: With `?area=akihabara&page=2` in the URL, only akihabara posts appear and the correct page offset is applied.

**Acceptance Scenarios**:

1. **Given** the user is filtering by area, **When** they navigate to page 2, **Then** the URL contains both `area` and `page` parameters and the correct filtered items are shown.
2. **Given** the user changes the area filter, **When** the new area is selected, **Then** pagination resets to page 1.

---

### Edge Cases

- What if `?page=0` or `?page=4` or a non-numeric value is passed? → Treat as page 1 (clamp to valid range 1–3).
- What if the total results are fewer than 20? → Show all items, hide pagination.
- What if page 2 is requested but only 20 or fewer total items exist? → Redirect or show page 1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top page table MUST display at most 20 items per page.
- **FR-002**: The total number of pages MUST be capped at 3 (maximum 60 browsable items).
- **FR-003**: The current page MUST be communicated via the URL query parameter `page` (e.g., `?page=2`).
- **FR-004**: Page navigation controls MUST include 「前へ」 (previous) and 「次へ」 (next) links.
- **FR-005**: The 「前へ」 control MUST be hidden or disabled on page 1.
- **FR-006**: The 「次へ」 control MUST be hidden or disabled on the last page.
- **FR-007**: An invalid or out-of-range `page` value MUST be treated as page 1.
- **FR-008**: Pagination MUST work in combination with the existing area filter (`?area=`).
- **FR-009**: Changing the area filter MUST reset pagination to page 1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: No more than 20 rows are visible in the table on any single page load — verifiable by counting table rows.
- **SC-002**: Users can reach any of the first 60 results in at most 3 page navigations from the top page.
- **SC-003**: Pagination controls appear only when there are more than 20 results — 0 false positives or negatives.
- **SC-004**: The `page` parameter in the URL correctly reflects the displayed page — 100% consistency between URL and displayed content.

## Assumptions

- The existing area filter query parameter (`?area=`) continues to work alongside `?page=`.
- The total result pool of up to 60 items is fetched server-side at render time; no client-side pagination or lazy loading is used.
- The tweet preview sidebar (oEmbed) continues to show the top 3 tweets from the full result set (not per-page), consistent with current behavior.
- Page numbers are 1-indexed (page 1, 2, 3).
- The shop detail page is out of scope for this feature.

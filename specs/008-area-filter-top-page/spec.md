# Feature Specification: Area Filter on Top Page

**Feature Branch**: `008-area-filter-top-page`  
**Created**: 2026-04-14  
**Status**: Draft  
**Input**: User description: "トップページにエリアフィルタリング機能を追加する。URLクエリパラメータ（?area=akihabara）でエリアを絞り込み、エリアボタンを並べて選択できるUIにする。エリアは akihabara / kawagoe / omiya / urawamisono の4つ。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Posts by Area (Priority: P1)

A visitor wants to see only stores in a specific area (e.g. Akihabara). They click an area button at the top of the page and the list updates to show only that area's stores.

**Why this priority**: Core feature — without this, all filtering logic is meaningless.

**Independent Test**: Navigate to `/?area=akihabara`. Only posts from akihabara stores appear. The "Akihabara" button appears visually selected.

**Acceptance Scenarios**:

1. **Given** the top page is loaded with no query param, **When** the user views the page, **Then** all areas are shown and no button is highlighted as selected (or "All" is highlighted).
2. **Given** the user clicks the "Akihabara" button, **When** the page loads with `?area=akihabara`, **Then** only akihabara posts are shown and the Akihabara button is visually active.
3. **Given** `?area=akihabara` is in the URL, **When** the user clicks "All", **Then** the page loads without a query param and all posts are shown.
4. **Given** an unknown area value is passed (e.g. `?area=invalid`), **When** the page loads, **Then** no posts are shown (or falls back to all — either is acceptable).

---

### User Story 2 - Share Filtered URL (Priority: P2)

A user wants to share a link to a specific area's page. They copy the URL with `?area=omiya` and send it to a friend, who opens it and sees only Omiya stores.

**Why this priority**: URL-based filtering enables bookmarking and sharing without extra implementation.

**Independent Test**: Open `/?area=omiya` directly in a new browser tab. Only omiya posts are displayed, no interaction required.

**Acceptance Scenarios**:

1. **Given** a user directly navigates to `/?area=omiya`, **When** the page renders, **Then** only omiya posts are shown and the Omiya button appears selected.

---

### Edge Cases

- What if an area has no on-sale posts in the last 14 days? → Empty state message is shown.
- What if `?area=` is empty string? → Treat as "All" (show all areas).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The top page MUST display area filter buttons for all known areas plus an "All" option.
- **FR-002**: When `?area=<value>` is present, the page MUST query only that area's posts.
- **FR-003**: When no `?area` param is present (or `?area=all`), the page MUST show posts from all areas.
- **FR-004**: The currently selected area button MUST be visually distinguished from unselected buttons.
- **FR-005**: Each area button MUST be a link that updates the URL query parameter (no JavaScript required for basic function).
- **FR-006**: The area values in the UI MUST display as human-readable Japanese labels (e.g. "秋葉原" for `akihabara`).

### Key Entities

- **Area**: A geographic grouping of stores. Known values: `akihabara`, `kawagoe`, `omiya`, `urawamisono`. Displayed as Japanese labels.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Navigating to `/?area=akihabara` shows only akihabara posts and no posts from other areas.
- **SC-002**: All 4 area buttons plus "All" are visible on the top page at all times.
- **SC-003**: The selected area button is visually distinct (different background/color) from unselected buttons.
- **SC-004**: The filtered URL can be shared and produces the same filtered view when opened directly.

## Assumptions

- Area values are fixed (`akihabara`, `kawagoe`, `omiya`, `urawamisono`); no dynamic discovery from the DB is needed.
- Japanese display labels are hardcoded: akihabara→秋葉原, kawagoe→川越, omiya→大宮, urawamisono→浦和美園.
- The filter is implemented entirely server-side via Next.js `searchParams`; no client-side JavaScript needed.
- No pagination is introduced in this feature; the existing 50-result cap remains.

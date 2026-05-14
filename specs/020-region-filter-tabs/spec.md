# Feature Specification: Region Filter Tabs for Oripa Listing

**Feature Branch**: `020-region-filter-tabs`  
**Created**: 2026-05-14  
**Status**: Draft  
**Input**: User description: "2-tier region filter tabs — 1st tier 全国/関東/関西, 2nd tier area tabs within selected region"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter by Region (Priority: P1)

A user visiting the oripa listing page wants to see only shops in their region (e.g., Kanto or Kansai) without having to scroll through all area tabs at once.

**Why this priority**: This is the core value of the feature — reducing cognitive load when multiple regions are displayed.

**Independent Test**: User can click "関東" to see only Kanto area tabs (秋葉原・池袋・新宿・川越・大宮), and click "関西" to see only Kansai area tabs (なんば・梅田). Delivers immediate browsing value.

**Acceptance Scenarios**:

1. **Given** the user is on the oripa listing page, **When** they click the "関東" region tab, **Then** only the area tabs for Kanto (秋葉原, 池袋, 新宿, 川越, 大宮) are displayed in the second tier
2. **Given** the user is on the oripa listing page, **When** they click the "関西" region tab, **Then** only the area tabs for Kansai (なんば, 梅田) are displayed in the second tier
3. **Given** the user has selected the "関東" region, **When** they click an area tab (e.g., 秋葉原), **Then** the card listing filters to that area

---

### User Story 2 - View All Regions (Priority: P2)

A user wants to browse posts from all regions at once without region filtering.

**Why this priority**: Preserves existing behavior for users who want a nationwide view.

**Independent Test**: User can click "全国" to see all area tabs and all cards regardless of region.

**Acceptance Scenarios**:

1. **Given** the user is on the oripa listing page, **When** they click "全国", **Then** all area tabs across all regions are shown (or the full unfiltered card list is displayed)
2. **Given** the user arrives on the page with no query parameters, **Then** the default view shows all regions (全国 is active)

---

### User Story 3 - Deep-link to Region + Area (Priority: P3)

A user shares or bookmarks a URL that includes both region and area parameters, and the page loads in the correct state.

**Why this priority**: Ensures shareability and navigation consistency.

**Independent Test**: Navigating to `?region=kanto&area=akihabara` loads with 関東 selected in tier-1 and 秋葉原 selected in tier-2.

**Acceptance Scenarios**:

1. **Given** the URL contains `?region=kanto`, **When** the page loads, **Then** 関東 is selected in the region tier and Kanto area tabs are shown
2. **Given** the URL contains `?region=kansai&area=namba`, **When** the page loads, **Then** 関西 is selected and なんば is highlighted in the area tier

---

### Edge Cases

- What happens when a user selects a region and then selects an area from a different region (e.g., via direct URL manipulation)? → The region tab updates to match the area's region.
- What happens when a new area is added to a region in the future? → It appears automatically in the correct region's area tab list.
- What happens on very narrow screens where both tiers don't fit horizontally? → Each tier scrolls horizontally independently.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The listing page MUST display a first-tier navigation with at minimum "全国", "関東", and "関西" options
- **FR-002**: Selecting a region in the first tier MUST update the second-tier area tabs to show only areas belonging to that region
- **FR-003**: Selecting "全国" MUST show all area tabs (or equivalently, show all cards with no area filter)
- **FR-004**: The selected region MUST be reflected in the URL query parameter so the state is shareable and bookmarkable
- **FR-005**: The second-tier area tabs MUST function identically to the current area tabs (filter card listing by area)
- **FR-006**: When a region is selected with no area chosen, the card listing MUST show posts from all areas within that region
- **FR-007**: The active region tab MUST be visually distinguished from inactive region tabs
- **FR-008**: New regions added in the future MUST be addable without structural code changes to the navigation component

### Key Entities

- **Region**: A geographic grouping (e.g., 関東, 関西) containing one or more areas. Has a key (e.g., `kanto`), display label (e.g., `関東`), and a list of area keys.
- **Area**: An existing concept (e.g., `akihabara`, `namba`) belonging to exactly one region.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can reach a region-filtered view in 1 click from the listing page (down from needing to identify the correct area tab among 7+)
- **SC-002**: The second-tier area tab list for any region contains only the areas belonging to that region — 0 cross-region tabs shown
- **SC-003**: All existing area deep-links (`?area=akihabara`) continue to work without redirect or error after the feature is deployed
- **SC-004**: The active region and area state is fully represented in the URL — sharing the URL reproduces the exact same filtered view

## Assumptions

- Region grouping is fixed at launch: 関東 = (秋葉原, 池袋, 新宿, 川越, 大宮), 関西 = (なんば, 梅田)
- A "全国" option showing all regions is included by default
- Existing `?area=` query parameter behavior is preserved for backward compatibility
- A new `?region=` query parameter is introduced; pages without it default to 全国
- Mobile layout scrolls the tab bars horizontally (same as current area tabs)
- No server-side changes are required — region filtering is a UI concern only, existing DynamoDB queries per area remain unchanged

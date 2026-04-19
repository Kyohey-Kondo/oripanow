# Feature Specification: Shop Detail Page Google Map

**Feature Branch**: `014-shop-google-map`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "ショップ別画面のテーブル上側に対象店舗のGoogle Mapを載せたい"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Store Location on Map (Priority: P1)

A user visits a shop detail page and can immediately see the store's approximate location on a map displayed above the oripa post table. This helps them judge whether the store is conveniently reachable before deciding to visit.

**Why this priority**: Core value of this feature — the map is the primary deliverable and must work for all registered stores using the store name as the search query.

**Independent Test**: A shop detail page shows an interactive map searched by the store name above the post table.

**Acceptance Scenarios**:

1. **Given** a shop detail page is loaded, **When** the page renders, **Then** a map searched by the store name is displayed above the oripa post table.
2. **Given** the map is rendered, **When** the user interacts with it (pan, zoom), **Then** the map responds to the interaction without affecting the rest of the page.
3. **Given** the map is rendered, **When** the user clicks a link on the map, **Then** Google Maps opens (in a new tab) showing the search results for the store name.

---

### User Story 2 - Improve Location Accuracy with Area Context (Priority: P2)

The map search query combines the store name with the store's area (e.g., "Duel Stade Ganryu 秋葉原") to reduce the chance of showing an unrelated store with a similar name.

**Why this priority**: Store names alone may match multiple unrelated places. Adding the area narrows the result without requiring a physical address.

**Independent Test**: The map displayed for a store uses a query that includes both the store name and its area label.

**Acceptance Scenarios**:

1. **Given** a shop detail page is loaded, **When** the map renders, **Then** the search query sent to the map service includes both the store name and the area name.

---

### Edge Cases

- What happens when the store name query returns no results? → The map renders in search mode; if no pin is found, the map shows the area-level view without a pin.
- What happens on a slow network? → The map loads independently and does not block the post table from being displayed.
- What happens on mobile? → The map section is responsive and does not overflow the viewport width.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shop detail page MUST display a map section above the oripa post table for every store.
- **FR-002**: The map MUST use the store name (and area name as supplementary context) as the search query to locate the store.
- **FR-003**: The map MUST be interactive (pan and zoom supported).
- **FR-004**: The map MUST include a link that opens the full Google Maps view for the store search query in a new browser tab.
- **FR-005**: The map section MUST be responsive and display correctly on both desktop and mobile viewports.
- **FR-006**: The map MUST NOT block rendering of the oripa post table below it.

### Key Entities

- **Store**: Has a `name` field (display name) and an `area` field. Both are used as the map search query.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of shop detail pages show a map section above the post table.
- **SC-002**: The map search query includes both the store name and area for 100% of stores.
- **SC-003**: The post table remains visible and usable even while the map is still loading.
- **SC-004**: The map section renders correctly (no overflow, no layout breakage) on viewports from 375px to 1440px wide.

## Assumptions

- Store name and area together provide sufficient specificity to identify the correct location in Google Maps for the stores currently registered.
- No physical address field is required for this feature; the map is best-effort based on name search.
- The map embed is loaded client-side and does not require server-side API key handling beyond what is already available.
- The map height is fixed at a reasonable size (e.g., 300px) to avoid dominating the page layout — exact dimensions are left to implementation.
- No custom map styling or branding is required; the default Google Maps appearance is acceptable.
- Area names used in the query correspond to recognizable Japanese location names (e.g., "akihabara" → "秋葉原").

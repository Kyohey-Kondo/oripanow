# Feature Specification: Responsive Layout

**Feature Branch**: `009-responsive-layout`
**Created**: 2026-04-18
**Status**: Draft
**Input**: User description: "レスポンシブ対応を実施したい。今だと右側のツイート列がスマホデバイスでは前面に重なってしまう。設計からしたい。どんなふうにしようか"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mobile Users Can Read the Store Table (Priority: P1)

A user visiting the site on a smartphone sees the store sale information table displayed cleanly without any overlapping UI. The tweet sidebar does not obscure the table.

**Why this priority**: The core value of the app is the store/sale data table. On mobile, the sidebar currently overlaps the table making the primary content unreadable. Fixing this unblocks all mobile users.

**Independent Test**: Can be fully tested by opening the page on a mobile-sized screen (e.g., 375px wide) and confirming the table columns are readable and no element overlaps another.

**Acceptance Scenarios**:

1. **Given** a user visits the top page on a smartphone (viewport ≤ 640px), **When** the page loads, **Then** the store table is fully visible with no overlapping sidebar.
2. **Given** a user visits the top page on a smartphone, **When** they scroll down, **Then** the tweet sidebar content does not appear floating on top of the table.
3. **Given** a user visits the top page on a smartphone, **When** the area filter nav is visible, **Then** the filter buttons wrap properly and remain tappable without overflow.

---

### User Story 2 - Tweet Previews Are Accessible on Mobile (Priority: P2)

A user on a smartphone can still access tweet previews, either by scrolling to them below the table or via a clear UI affordance (e.g., the sidebar stacks below the table vertically).

**Why this priority**: The tweet previews provide valuable context (photos of store stock). While not blocking the core use case, surfacing them on mobile improves the information experience.

**Independent Test**: Can be tested by opening the page on a 375px wide viewport and verifying tweet preview content is reachable by scrolling, without the page breaking.

**Acceptance Scenarios**:

1. **Given** a user on mobile views the page, **When** they scroll past the store table, **Then** tweet previews appear below the table in a single-column layout.
2. **Given** a user on mobile, **When** tweet previews are rendered, **Then** they fit within the screen width without horizontal overflow.

---

### User Story 3 - Desktop Layout Is Preserved (Priority: P3)

Desktop and tablet users continue to see the existing side-by-side layout: store table on the left, tweet sidebar on the right.

**Why this priority**: The desktop experience already works. This story ensures the responsive fix does not regress it.

**Independent Test**: Can be tested by opening the page at 1024px+ width and confirming the two-column layout is intact.

**Acceptance Scenarios**:

1. **Given** a user visits on a desktop browser (viewport ≥ 1024px), **When** the page loads, **Then** the store table and tweet sidebar appear side by side.
2. **Given** a user resizes from desktop to mobile width, **When** the viewport crosses the mobile breakpoint, **Then** the layout switches to a single-column stacked view without a full page reload.

---

### Edge Cases

- What happens when there are no tweet previews available? (sidebar/section is absent — the table should still be full-width on all screen sizes)
- What happens when the table has many columns on a narrow screen? (table may need horizontal scrolling or simplified columns on mobile)
- What happens when the area filter nav has many buttons? (buttons should wrap to multiple lines, not overflow horizontally)
- How does the layout behave on mid-size screens (641–1023px, e.g., tablets)? (treated as desktop: two-column layout is reasonable at tablet widths)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The layout MUST stack vertically (single column) on viewports narrower than 641px, with the store table above and tweet previews below.
- **FR-002**: The layout MUST display as two columns (table left, tweet sidebar right) on viewports 641px and wider.
- **FR-003**: The tweet sidebar MUST NOT overlap or float over the store table at any viewport size.
- **FR-004**: The area filter navigation MUST wrap onto multiple lines rather than overflow horizontally on narrow viewports.
- **FR-005**: Tweet preview cards in the mobile stacked view MUST fit within the screen width without causing horizontal page scroll.
- **FR-006**: The store table MUST be horizontally scrollable on narrow viewports if its content cannot fit within the screen width.
- **FR-007**: All interactive elements (filter buttons, tweet links) MUST remain tappable with adequate touch target size on mobile.

### Key Entities

- **Main layout container**: The `<div>` wrapping both the store table and tweet sidebar — controls the column/row switch.
- **Store table**: The primary data grid; must always be reachable and readable.
- **Tweet sidebar (`<aside>`)**: Secondary content containing oEmbed tweet previews; positioned right on desktop, below on mobile.
- **Area filter nav**: Row of anchor buttons for filtering by area; must wrap gracefully.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 375px-wide viewport, no element from the tweet sidebar overlaps the store table (zero overlap).
- **SC-002**: On a 375px-wide viewport, all area filter buttons are visible and tappable without horizontal scrolling in the nav bar.
- **SC-003**: On a 1280px-wide viewport, the two-column layout remains exactly as it is today (no visual regression).
- **SC-004**: The layout transition between mobile and desktop breakpoints works correctly when the browser window is resized live (no layout breakage at the breakpoint boundary).
- **SC-005**: Tweet preview content on mobile does not cause horizontal page overflow (window scroll width equals window client width).

## Assumptions

- The breakpoint between mobile and desktop is 640px (max-width for mobile). Tablet (641–1023px) uses the desktop two-column layout, as the sidebar width of ~285px is manageable at that size.
- The fix is purely a CSS/layout change — no new data fetching, API changes, or database changes are required.
- The existing inline styles in `apps/web/app/page.tsx` will be migrated to CSS classes (e.g., Tailwind or CSS modules) as part of this work, since media queries cannot be expressed in inline styles.
- The desktop visual appearance (colors, spacing, typography) is frozen — only the responsive behavior is added.
- No separate mobile-only content or features are introduced; the same data is shown in a different arrangement.
- Playwright screenshot verification is required before deploying (per project policy).

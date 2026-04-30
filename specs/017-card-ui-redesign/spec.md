# Feature Specification: Oripa Card UI Redesign

**Feature Branch**: `017-card-ui-redesign`  
**Created**: 2026-04-29  
**Status**: Draft  
**Input**: User description: "このモックを踏襲するようにフロントエンドを改善したい"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Oripa Posts as Cards (Priority: P1)

A visitor to the oripa page sees all oripa posts displayed as a responsive card grid rather than a plain table. Each card shows the store name, post time, price, stock count, last-one prize, and hit cards at a glance. The dark-themed design makes the page visually distinct and easy to scan.

**Why this priority**: This is the core visual change — the entire page layout shifts from a table to a card grid. All other improvements depend on this being in place.

**Independent Test**: Can be fully tested by navigating to `/oripa` and confirming cards render in a grid with dark background and price information visible.

**Acceptance Scenarios**:

1. **Given** a user visits `/oripa`, **When** the page loads, **Then** posts are shown as a dark-themed card grid (not a table), with at least 2 columns on desktop.
2. **Given** a post has a price, **When** the card renders, **Then** the price is displayed prominently with a color-coded top bar (gold for ¥10,000+, blue for ¥5,000–¥9,999, green for under ¥5,000).
3. **Given** a post has no price, **When** the card renders, **Then** the price area shows "—" without breaking the layout.

---

### User Story 2 - View Last-One and Hit Card Awards on Card (Priority: P2)

A visitor can see at-a-glance whether a post has last-one prize or hit card information directly on the card, without clicking through. Labeled badges clearly distinguish "ラスト" and "あたり" rows.

**Why this priority**: Atari/last-one info is the primary value for users deciding which oripa to pursue. Surfacing it on the card reduces clicks.

**Independent Test**: Can be fully tested with a post that has both `lastOnePrizeName` and `atariCards` populated — confirm both badge rows appear in the card body.

**Acceptance Scenarios**:

1. **Given** a post has `lastOnePrizeName`, **When** the card renders, **Then** a "ラスト" badge row appears with the prize name.
2. **Given** a post has `atariCards`, **When** the card renders, **Then** an "あたり" badge row appears listing the card names.
3. **Given** a post has neither award field, **When** the card renders, **Then** a "当たり・ラストワン情報なし" placeholder text is shown instead.

---

### User Story 3 - Filter by Area with Tab UI (Priority: P3)

A visitor can filter oripa posts by area using horizontally scrollable pill-shaped tabs. The active tab is visually highlighted. Selecting an area reloads the page filtered to that area.

**Why this priority**: Area filtering already exists but uses basic link buttons. Upgrading the tab UI to match the mockup's pill-style makes the filter more discoverable and visually consistent.

**Independent Test**: Can be fully tested by clicking area tabs and confirming only posts from that area appear, and the clicked tab is highlighted.

**Acceptance Scenarios**:

1. **Given** a user is on `/oripa`, **When** they see the area filter, **Then** tabs for すべて, 秋葉原, 川越, 大宮, 浦和美園 are visible as pill buttons.
2. **Given** no area filter is active, **When** the page loads, **Then** the "すべて" tab appears visually active (distinct background/color).
3. **Given** a user clicks an area tab, **When** the navigation occurs, **Then** only posts from that area are shown and that tab appears active.
4. **Given** the viewport is narrow (mobile), **When** area tabs are displayed, **Then** they scroll horizontally without wrapping.

---

### User Story 4 - Navigate to Store Detail from Card (Priority: P4)

A visitor can click the store name on a card to navigate to the store detail page.

**Why this priority**: This link already exists in the table view. It must be preserved in the new card design.

**Independent Test**: Click a store name on a card and confirm navigation to `/oripa/shops/[storeId]`.

**Acceptance Scenarios**:

1. **Given** a user sees a card, **When** they click the store name, **Then** they are taken to the store's detail page.
2. **Given** a user sees a card, **When** they click "ポストを見る" in the card footer, **Then** the original tweet opens in a new tab on X (Twitter).

---

### Edge Cases

- What happens when a post has a very long store name? (Should truncate with ellipsis)
- What happens when `atariCards` has many items? (Should show first 3 with "+ N more" or join with " / ")
- What happens on mobile with a single-column layout? (Cards should stack vertically, no horizontal overflow)
- What happens when there are no posts for a given area? (Empty state message should appear)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The oripa list page MUST display posts as a responsive card grid instead of a table.
- **FR-002**: Each card MUST show: store name (linked to store page), post timestamp, price, stock count, last-one prize name (if any), atari cards (if any), area tag, and link to original tweet.
- **FR-003**: Cards MUST have a color-coded top accent bar based on price tier: gold (¥10,000+), blue (¥5,000–¥9,999), green (below ¥5,000), and default gold when price is unknown.
- **FR-004**: The page MUST use a dark color scheme as defined in the reference mockup (`oripa-card-ui.html`).
- **FR-005**: The area filter MUST be rendered as pill-shaped tabs with the active area visually distinguished.
- **FR-006**: Area tabs MUST scroll horizontally on small viewports without wrapping.
- **FR-007**: Cards with last-one prize information MUST display a "ラスト" labeled badge. Cards with atari card information MUST display an "あたり" labeled badge.
- **FR-008**: Cards without either award field MUST display a "当たり・ラストワン情報なし" placeholder.
- **FR-009**: Store names exceeding display width MUST be truncated with an ellipsis.
- **FR-010**: The page header MUST display the site logo/brand and a "LIVE" status indicator.
- **FR-011**: Pagination controls MUST remain functional with the new design.
- **FR-012**: The existing tweet sidebar (oEmbed previews) and ad banners MUST remain in the layout (placement adjustments allowed).
- **FR-013**: The card grid MUST be responsive: minimum 1 column on mobile, up to 3 columns on wide screens.

### Key Entities

- **OripaPost**: A single oripa offering post — includes store name, store ID, tweet ID, price, stock count, last-one prize name, atari cards array, area, and created-at timestamp.
- **PriceTier**: Derived from post price — high (¥10,000+), mid (¥5,000–¥9,999), low (below ¥5,000), unknown (no price data).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All information currently visible in the table (store, time, price, stock, awards, tweet link) is accessible on the redesigned card without clicking through.
- **SC-002**: The page layout is responsive and usable on viewports from 375px (iPhone SE) through 1440px (desktop).
- **SC-003**: Visual appearance matches the reference mockup (`oripa-card-ui.html`) with no major layout deviations as confirmed by screenshot comparison.
- **SC-004**: All existing links (store detail, tweet, area filters, pagination) remain functional after the redesign.
- **SC-005**: No regression in area filtering or pagination behavior compared to the current implementation.

## Assumptions

- The existing data model (`OripaPostSummary` type in `lib/posts.ts`) does not require changes — only the presentation layer changes.
- The tweet sidebar (oEmbed + ad banners) will be retained but may be repositioned or collapsed on mobile.
- The `oripa-card-ui.html` mockup is the authoritative design reference; pixel-perfect match is not required but overall visual language (dark theme, card layout, color-coded tiers, badge styles) must be faithfully reproduced.
- The page route (`/oripa`) and its `searchParams` contract (`area`, `page`) remain unchanged.
- Google Fonts (Orbitron, Zen Kaku Gothic New) used in the mockup are acceptable to include.
- Ad banners in the layout are preserved; their placement may adjust to fit the new grid design.

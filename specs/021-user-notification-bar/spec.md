# Feature Specification: Invitation Code Promo Bar & Page

**Feature Branch**: `021-user-notification-bar`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "一般ユーザー向けの通知バーを追加しよう。各種オリパサイトの招待コードとリンクをまとめたページへの導線。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Follow the Promo Bar to the Invitation Code Page (Priority: P1)

A visitor on any page of oripanow.app sees a fixed bar at the top of the screen with a message like "招待コードはこちら →". Tapping or clicking that bar navigates them to a dedicated page listing various oripa sites together with their invitation codes and sign-up links.

**Why this priority**: This is the core end-to-end flow. Without both the bar and the destination page, no user value is delivered.

**Independent Test**: Can be fully tested by clicking the bar and confirming the destination page loads with at least one oripa site entry.

**Acceptance Scenarios**:

1. **Given** a user visits any page on oripanow.app, **When** the page loads, **Then** a promo bar is visible at the top of the screen with a clear call-to-action.
2. **Given** the promo bar is visible, **When** the user taps or clicks it, **Then** they are taken to the invitation code list page.
3. **Given** the invitation code list page, **When** the user views it, **Then** they see each oripa site listed with its name, invitation code, and a link to sign up.

---

### User Story 2 - Copy or Use an Invitation Code (Priority: P2)

On the invitation code list page, a user finds the oripa site they want to join and either copies the invitation code or clicks a direct sign-up link that pre-fills or references the code.

**Why this priority**: Without easy access to the code itself, users may drop off before completing sign-up.

**Independent Test**: Can be tested independently by visiting the invitation code page directly and verifying each entry has a usable code and link.

**Acceptance Scenarios**:

1. **Given** the invitation code list page, **When** the user finds a site they want to join, **Then** the invitation code is clearly displayed and easy to copy.
2. **Given** an oripa site entry has a referral URL, **When** the user clicks the link, **Then** they are taken to that site's sign-up or top page in a new tab.

---

### User Story 3 - Dismiss the Promo Bar (Priority: P3)

A returning user who has already seen the bar and visited the invitation code page can dismiss the bar to reduce visual clutter.

**Why this priority**: Nice-to-have for repeat visitors, but does not affect the core flow.

**Independent Test**: Can be tested by clicking the close button and confirming the bar disappears for the remainder of the session.

**Acceptance Scenarios**:

1. **Given** the promo bar is visible, **When** the user clicks the dismiss button, **Then** the bar is hidden immediately and does not reappear during the same session.

---

### Edge Cases

- What happens when the invitation code list page has no entries (data file is empty)?
- How does the promo bar text truncate on very narrow mobile screens?
- What if a referral URL for a site is not yet known — how is that entry displayed?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST display a promo bar at the top of every page linking to the invitation code list page.
- **FR-002**: The promo bar MUST contain a short message and a clear call-to-action that is tappable/clickable.
- **FR-003**: Clicking the promo bar MUST navigate the user to the invitation code list page.
- **FR-004**: The invitation code list page MUST display each oripa site with: site name, invitation code, and a link to the site.
- **FR-005**: Each site link on the invitation code list page MUST open in a new browser tab.
- **FR-006**: Users MUST be able to dismiss the promo bar; it MUST NOT reappear in the same browser session.
- **FR-007**: The list of oripa sites and invitation codes MUST be managed via a static data file (no CMS or database required).
- **FR-008**: The promo bar MUST be visible on both desktop and mobile screen sizes.

### Key Entities

- **PromoBar**: A fixed UI element appearing at the top of every page. Contains a label and a link to the invitation code page. Hardcoded content; toggled by code if needed.
- **InvitationCodeEntry**: One oripa site record containing: site name, invitation code string, sign-up/referral URL, and an optional short description. Stored in a static data file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The promo bar is visible on 100% of pages without causing layout shift or obscuring primary content.
- **SC-002**: A user can reach the invitation code list page in one tap/click from any page.
- **SC-003**: Every entry on the invitation code list page has a visible invitation code and at least one link.
- **SC-004**: Adding or updating an oripa site entry requires editing only one static data file — no code logic changes.
- **SC-005**: The bar and destination page render correctly at viewport widths from 320px to 1920px.

## Assumptions

- The promo bar content (label text) is fixed for this feature; changing it requires a code edit.
- One promo bar is sufficient; multiple simultaneous banners are out of scope.
- Invitation code entries are managed by the developer via a static file (e.g., TypeScript array or JSON).
- The number of oripa sites listed is small (< 20) for v1; pagination is out of scope.
- No analytics tracking (click counts, conversion) is required for v1.
- The invitation code list page is publicly accessible — no authentication required.

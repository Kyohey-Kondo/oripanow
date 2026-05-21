# Feature Specification: Pokémon Card Giveaway Campaign Page

**Feature Branch**: `022-pokeca-giveaway-page`
**Created**: 2026-05-21
**Status**: Draft
**Input**: User description: "ポケカ（ポケモンカード）のプレゼント企画情報をTwitterから自動収集し、一覧表示するページ。景品内容（BOX・シングルカード）、応募条件（フォロー/RT等）、締め切り日を表示する。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Active Giveaways (Priority: P1)

A visitor wants to see currently active Pokémon card giveaway campaigns, so they can enter before the deadline.

**Why this priority**: This is the core value of the feature — showing users what giveaways they can enter right now.

**Independent Test**: Visit `/giveaway`, see a list of active giveaway campaigns with prize content, entry conditions, and deadline. Delivers immediate value as a discovery tool.

**Acceptance Scenarios**:

1. **Given** active giveaway campaigns exist, **When** a user visits the giveaway page, **Then** they see a list of giveaway cards each showing the prize (e.g., "バトルパートナーズ BOX × 1名"), the entry conditions (e.g., "フォロー＋RT"), and the deadline date.
2. **Given** a giveaway has no explicit deadline, **When** a user views its card, **Then** the deadline is shown as "締め切り不明" (deadline unknown).
3. **Given** a giveaway deadline has passed, **When** a user views the page, **Then** that giveaway is NOT shown.

---

### User Story 2 - Filter by Prize Type (Priority: P2)

A visitor who specifically wants BOX giveaways (or single card giveaways) can filter the list to see only relevant campaigns.

**Why this priority**: Differentiating BOX vs single card giveaways is a key user need mentioned in the requirements.

**Independent Test**: On the giveaway page, click "BOXのみ" filter — only giveaway cards with a BOX prize are shown.

**Acceptance Scenarios**:

1. **Given** multiple giveaways exist with mixed prize types, **When** the user selects "BOXのみ", **Then** only giveaways containing a BOX prize are displayed.
2. **Given** multiple giveaways exist with mixed prize types, **When** the user selects "シングルのみ", **Then** only giveaways with a single card prize are displayed.
3. **Given** the user has filtered to "BOXのみ", **When** they select "すべて", **Then** all active giveaways are shown again.

---

### User Story 3 - Sort by Deadline (Priority: P2)

A visitor wants to see the most time-sensitive giveaways at the top so they don't miss deadlines.

**Why this priority**: Deadline-first sorting helps users prioritize which campaigns to enter.

**Independent Test**: On the giveaway page, campaigns with the nearest deadline appear at the top; campaigns without a deadline appear at the bottom.

**Acceptance Scenarios**:

1. **Given** multiple active giveaways with different deadlines, **When** a user visits the page, **Then** giveaways are sorted with the soonest deadline first by default.
2. **Given** some giveaways have no deadline, **When** sorted by deadline, **Then** those giveaways appear at the bottom of the list.
3. **Given** a user selects "新着順", **When** viewing the page, **Then** giveaways are sorted with the most recently posted at the top.

---

### User Story 4 - Navigate to Original Tweet (Priority: P3)

A user who wants to enter a giveaway can click through to the original Twitter post to follow and RT.

**Why this priority**: The giveaway is only actionable if the user can find and interact with the original tweet.

**Independent Test**: Each giveaway card has a link; clicking it opens the original tweet in a new tab.

**Acceptance Scenarios**:

1. **Given** a giveaway card is shown, **When** the user clicks the tweet link button, **Then** the original tweet opens in a new browser tab.

---

### Edge Cases

- What happens when no active giveaways exist? Display an empty state message ("現在受付中のプレゼント企画はありません").
- What happens when a tweet is not actually a Pokémon card giveaway? The AI analysis discards it as "not_giveaway" and it is never shown.
- What if a tweet announces multiple prizes (e.g., 1st prize BOX, 2nd prize single card)? All prizes are shown on the card.
- What if the deadline date extracted from the tweet is ambiguous? Treat as unknown; show "締め切り不明".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST automatically collect Pokémon card giveaway tweets from both existing tracked store accounts and broad keyword search.
- **FR-002**: The system MUST use AI to extract prize content (type: BOX or single card, name, winner count), entry conditions, and deadline from each tweet.
- **FR-003**: Tweets that are not genuine Pokémon card giveaway campaigns MUST be discarded automatically.
- **FR-004**: The system MUST display a dedicated page listing all currently active giveaway campaigns.
- **FR-005**: Each giveaway entry MUST display: prize name and type (BOX/single), entry conditions, and deadline date.
- **FR-006**: Users MUST be able to filter giveaways by prize type (all / BOX only / single card only).
- **FR-007**: Users MUST be able to sort giveaways by deadline (soonest first) or by newest post.
- **FR-008**: Each giveaway entry MUST include a link to the original tweet.
- **FR-009**: Giveaways whose deadline has passed MUST NOT appear in the list.
- **FR-010**: Giveaways without an explicit deadline MUST still be shown, with "締め切り不明" displayed in place of the deadline.

### Key Entities

- **GiveawayTweet**: A raw tweet collected from Twitter, pending AI analysis. Attributes: tweet ID, source (store account or keyword search), tweet text, posted date.
- **GiveawayCampaign**: An analyzed giveaway campaign. Attributes: prize list (type, name, winner count), entry conditions, deadline, status (active/ended/upcoming), source tweet reference.
- **Prize**: A single prize within a giveaway. Attributes: type (BOX / single card / other), product name, winner count (optional).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse all currently active Pokémon card giveaway campaigns from a single page without leaving the site.
- **SC-002**: New giveaway campaigns appear on the page within 24 hours of being posted on Twitter.
- **SC-003**: Each giveaway card correctly shows the prize type (BOX or single card), entry conditions, and deadline in 95% of cases where that information is present in the tweet.
- **SC-004**: Users can filter the list by prize type in under 1 second (client-side filtering).
- **SC-005**: Users can navigate to the original tweet to enter a giveaway within 2 clicks from the top of the page.

## Assumptions

- Twitter giveaway campaigns are typically posted in Japanese by Japanese Pokémon card shops or community accounts.
- A "giveaway" requires at minimum: a prize (Pokémon card product), and an action the user must take to enter (follow/RT/comment).
- The feature covers only Pokémon card giveaways; other game cards and merchandise are out of scope.
- Mobile responsiveness follows the same responsive design already in place for the oripa pages.
- The giveaway collection runs once daily — near-real-time updates are not required.
- Ended giveaways are hidden from the list but retained in the database for potential future analytics.

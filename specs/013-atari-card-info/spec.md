# Feature Specification: Atari Card Info

**Feature Branch**: `013-atari-card-info`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "次はいわゆる「あたり」のカード情報を追加したい。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Atari Cards on Top Page and Shop Detail Page (Priority: P1)

A visitor browsing the top page or a shop detail page wants to know which valuable cards ("あたり") are included in an oripa before deciding to buy. When atari cards are listed in a tweet, their names are displayed alongside the oripa entry.

**Why this priority**: Knowing the potential prizes is the primary purchase driver for oripa buyers. Displaying atari card names dramatically increases the utility of the aggregator.

**Independent Test**: Can be tested by viewing an oripa entry derived from a tweet that lists atari cards — the card names should appear in the UI row for that oripa.

**Acceptance Scenarios**:

1. **Given** a tweet mentions atari cards for an oripa (e.g., "あたり: ピカチュウex SAR / リザードンex SAR"), **When** the tweet is analyzed, **Then** the oripa post record includes the list of atari card names.
2. **Given** an oripa post has atari card names, **When** the top page or shop detail page renders that row, **Then** the atari card names are displayed in the corresponding column.
3. **Given** a tweet mentions no atari cards, **When** the tweet is analyzed, **Then** the atari card field is absent or empty on the oripa post record, and the UI shows "—".
4. **Given** a tweet has multiple oripa tiers, **When** atari cards are clearly associated with a specific tier, **Then** each tier's post record stores only its own atari cards.

---

### User Story 2 - Search or Filter by Atari Card Name (Priority: P2)

A user looking for a specific card (e.g., "ピカチュウex SAR") wants to find oripa listings that include it as an atari. They can search or filter the top page by card name.

**Why this priority**: Useful once P1 is in place; allows power users to target specific desired cards across all shops.

**Independent Test**: Can be tested by entering a card name in the filter and confirming only matching oripa rows are shown.

**Acceptance Scenarios**:

1. **Given** the top page displays multiple oripa entries, **When** a user types a card name into a search field, **Then** only rows whose atari card list contains a match are displayed.
2. **Given** no oripa listings contain the searched card name, **When** a user searches, **Then** a "該当なし" (no results) message is shown.

---

### Edge Cases

- What if a tweet lists many atari cards (10+)? Display should remain readable without overflowing the table row.
- What if atari card names use non-standard notation (e.g., abbreviations, card numbers like "094/101")? The system should store the text as-is.
- What if atari cards are shared across all tiers in a tweet (not tier-specific)? They should be copied to all tier records.
- What if the AI cannot confidently identify atari cards (ambiguous tweet)? The field should be omitted rather than guessing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tweet analysis system MUST attempt to extract a list of atari card names from each tweet it processes.
- **FR-002**: When atari cards are detected, the system MUST store them as a list of card name strings on the corresponding oripa post record.
- **FR-003**: When no atari cards are mentioned in the tweet, the system MUST leave the field absent or empty on the oripa post record.
- **FR-004**: The top page and shop detail page MUST display atari card names when present, in a readable format within the oripa row.
- **FR-005**: If atari cards are shared across all tiers in a multi-tier tweet, the system MUST store them on each tier's post record.
- **FR-006**: The system MUST handle common atari phrasing variants (e.g., "あたり", "封入あたり", "確定あたり", "当たり", "大当たり", "封入内容").

### Key Entities

- **OripaPost**: Extended with an optional `atariCards` attribute — a list of card name strings (e.g., `["ピカチュウex SAR", "リザードンex SAR"]`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For tweets that clearly list atari cards, the correct card names are extracted and stored in at least 85% of cases.
- **SC-002**: For tweets with no atari card mention, the field is correctly absent in 100% of processed records.
- **SC-003**: Atari card names are visible to users on the top page and shop detail page without any additional interaction.
- **SC-004**: Rows with more than 3 atari cards display in a way that does not break the table layout.

## Assumptions

- The existing AI-based tweet analysis pipeline (Claude API via Bedrock) will be extended — no new infrastructure.
- Atari card information appears in the tweet text itself (not in attached images); text-only extraction is sufficient for v1.
- `atariCards` is stored as a list of strings; no normalization or deduplication of card names is performed.
- When a tweet's atari cards are not clearly associated with a specific price tier, they are applied to all tiers derived from that tweet.
- The UI display format (comma-separated inline, multiline, truncated with "…") will be decided during planning.
- Image-based atari detection (e.g., card names only in an attached photo) is out of scope for v1.
- P2 (search/filter by card name) is deferred and will be planned separately if P1 is validated.

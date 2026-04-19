# Feature Specification: Last One Prize Detection

**Feature Branch**: `012-last-one-prize-detection`  
**Created**: 2026-04-19  
**Status**: Draft  
**Input**: User description: "ツイート解析で検出したい属性を追加したい。それはラストワン賞の商品名。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Last One Prize Info on Top Page (Priority: P1)

A visitor browsing the top page wants to know not just the price and stock count of an oripa, but also whether there's a "last one prize" — a special reward for the buyer of the final pack. When a last one prize is present, its product name is displayed alongside the oripa entry.

**Why this priority**: Last one prizes are a key purchase driver in the oripa market. Showing this information helps users make more informed decisions and increases the value of the aggregator.

**Independent Test**: Can be tested by viewing an oripa entry derived from a tweet that mentions a last one prize — the prize product name should appear in the UI.

**Acceptance Scenarios**:

1. **Given** a tweet mentions an oripa with a last one prize (e.g., "ラストワン賞: ピカチュウex SAR"), **When** the tweet is analyzed, **Then** the oripa post record includes the prize product name.
2. **Given** an oripa post has a last one prize product name, **When** the top page or shop detail page displays that post, **Then** the prize product name is shown in the oripa card.
3. **Given** a tweet mentions an oripa with no last one prize, **When** the tweet is analyzed, **Then** the oripa post record has no last one prize field (or it is empty/null).

---

### User Story 2 - Filter or Highlight Posts with Last One Prize (Priority: P2)

A power user wants to quickly find oripa listings that have a last one prize, as these are considered high-value opportunities.

**Why this priority**: Useful secondary feature once detection is in place; depends on P1 being complete.

**Independent Test**: Can be tested independently if a filtering/highlighting UI element is added to the top page.

**Acceptance Scenarios**:

1. **Given** the top page displays multiple oripa entries, **When** a user selects a "ラストワン賞あり" filter, **Then** only oripa posts with a last one prize product name are shown.
2. **Given** an oripa entry has a last one prize, **When** rendered in the list, **Then** it is visually distinguished (e.g., a badge or label).

---

### Edge Cases

- What happens when a tweet mentions multiple last one prizes (e.g., for multiple oripa tiers)?
- What happens when the prize name is ambiguous or partially cut off due to tweet length?
- How does the system handle tweets that use non-standard phrasing for last one prizes (e.g., "最後の1口は〇〇", "ラス1賞")?
- What if the AI cannot confidently extract a last one prize name — should it omit the field or record a low-confidence value?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tweet analysis system MUST attempt to extract a last one prize product name from each tweet it processes.
- **FR-002**: When a last one prize product name is detected, the system MUST store it on the corresponding oripa post record.
- **FR-003**: When no last one prize is mentioned in the tweet, the system MUST leave the field absent or null on the oripa post record.
- **FR-004**: The top page and shop detail page MUST display the last one prize product name when it is present on an oripa post.
- **FR-005**: If a tweet references multiple last one prizes (one per oripa tier in the same tweet), the system MUST associate each prize name with the correct oripa entry derived from that tweet.
- **FR-006**: The system MUST handle non-standard last one prize phrasings (e.g., "ラス1賞", "最後の1口") and still attempt extraction.

### Key Entities

- **OripaPost**: Extended with an optional `lastOnePrizeName` attribute (text) representing the product name of the last one prize for that oripa listing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For tweets that contain a clearly stated last one prize, the correct product name is extracted and stored in at least 90% of cases.
- **SC-002**: For tweets with no last one prize mention, the field is correctly absent in 100% of processed records.
- **SC-003**: The last one prize product name is visible to users on the top page and shop detail page without requiring any additional interaction.
- **SC-004**: Processing time per tweet does not increase by more than 20% compared to the pre-feature baseline.

## Assumptions

- The existing AI-based tweet analysis pipeline (Claude API) will be extended — no new analysis infrastructure is introduced.
- Last one prize information appears in the tweet text itself (not in attached images), so text-only extraction is sufficient for v1.
- Multiple oripa tiers in a single tweet each get their own `OripaPost` record (as already implemented via the `-N` suffix pattern), so per-tier prize names can be stored independently.
- Image-based last one prize detection (e.g., prize names only in a photo) is out of scope for v1.
- The UI display format (label, badge, inline text) will be decided during planning.

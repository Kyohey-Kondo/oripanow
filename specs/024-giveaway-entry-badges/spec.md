# Feature Specification: Giveaway Entry Condition Badges

**Feature Branch**: `024-giveaway-entry-badges`  
**Created**: 2026-05-27  
**Status**: Draft  
**Input**: User description: "giveawayのページを改善したい。応募条件は大体パターン化されているので、フォロー、リポスト、リプライ、その他、のような固定のバッジの表現にして、必要なものをアクティブにするのはどうか。補足蘭を追加し、リプライの内容やその他必要事項などを追加する構成"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Structured Entry Conditions at a Glance (Priority: P1)

A visitor browsing the giveaway page wants to quickly understand what actions are required to enter each giveaway. Instead of reading free-text descriptions, they see four clearly labeled badges — フォロー, リポスト, リプライ, その他 — with required conditions highlighted and non-required ones visually dimmed.

**Why this priority**: This is the core UX improvement. Every giveaway card is affected, and it delivers immediate value by making entry conditions scannable without reading text.

**Independent Test**: Can be fully tested by viewing the giveaway page and confirming that each card shows four badge slots with active/inactive visual differentiation. Delivers the complete improved conditions display.

**Acceptance Scenarios**:

1. **Given** a giveaway that requires follow and repost, **When** the user views its card, **Then** フォロー and リポスト badges appear highlighted (active) and リプライ and その他 badges appear dimmed (inactive).
2. **Given** a giveaway that requires all four condition types, **When** the user views its card, **Then** all four badges are highlighted.
3. **Given** a giveaway card with no extractable entry conditions, **When** the user views it, **Then** the conditions row is not shown (no empty badges).

---

### User Story 2 - Read Supplementary Condition Details (Priority: P2)

A visitor wants to understand the specific details of a required condition — for example, what hashtag to include in a reply, or that they must follow two accounts. They see a supplementary note below the badges when additional detail exists.

**Why this priority**: Badges convey the category of condition but not the specifics. The note field is essential for entries with non-obvious requirements (specific hashtag, multi-account follow, quote-tweet content).

**Independent Test**: Can be fully tested by viewing a giveaway card that has a note and confirming the note text appears below the badge row. Delivers complete condition information without needing to open the original tweet.

**Acceptance Scenarios**:

1. **Given** a giveaway that requires a reply with a specific hashtag, **When** the user views its card, **Then** the リプライ badge is active and a note below the badges reads the hashtag requirement in Japanese.
2. **Given** a giveaway whose conditions have no supplementary details, **When** the user views its card, **Then** no note text appears below the badge row.

---

### User Story 3 - AI Extracts Structured Conditions from Tweet Text (Priority: P3)

The batch processing pipeline analyzes new giveaway tweets and accurately extracts structured conditions (four booleans + optional note) from Japanese tweet text.

**Why this priority**: Without accurate AI extraction, the badges would be wrong or missing. However, the UI can be implemented and tested independently with mock data; the AI extraction is a separate layer.

**Independent Test**: Can be tested by running the batch analyzer against sample tweets and verifying the stored structured conditions match the tweet's actual requirements.

**Acceptance Scenarios**:

1. **Given** a tweet containing "フォロー＆RTで応募", **When** the analyzer processes it, **Then** `follow: true`, `repost: true`, `reply: false`, `other: false` is stored.
2. **Given** a tweet containing "フォロー・引用RT（指定ハッシュタグを付けて）", **When** the analyzer processes it, **Then** `follow: true`, `reply: true`, `other: true` (hashtag) is stored with the hashtag requirement in the note field.
3. **Given** a tweet that is not a giveaway, **When** the analyzer processes it, **Then** no entry conditions are stored.

---

### Edge Cases

- What happens when none of the four condition types apply (all false)? No conditions row is stored or displayed.
- What happens if the tweet text is ambiguous (e.g., "詳細はリプ欄")?  The analyzer sets `other: true` and stores the note with the available detail; no condition is silently dropped.
- What happens to existing giveaway records that still have the old free-text `conditions` field? They display no conditions row (the structured field is absent); they age out naturally as active giveaways expire within days to weeks.
- What if `note` is very long? The note field is displayed as-is with natural line wrapping; no truncation or character limit is enforced at the display layer.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent each giveaway's entry conditions as four distinct boolean flags: フォロー (follow account), リポスト (repost/RT), リプライ (reply or quote-tweet), その他 (other requirements).
- **FR-002**: Each giveaway card MUST display all four condition badges simultaneously, with required conditions visually highlighted and non-required conditions visually dimmed.
- **FR-003**: The system MUST support an optional supplementary note field per giveaway to convey condition details that cannot be captured by the four flags alone (e.g., hashtag content, number of accounts to follow).
- **FR-004**: When a supplementary note is present, it MUST be displayed below the badge row within the same card.
- **FR-005**: The AI batch analyzer MUST extract structured conditions (four booleans + optional note) from Japanese tweet text and store them in place of the previous free-text conditions string.
- **FR-006**: Giveaway records that have no structured conditions (e.g., legacy records) MUST NOT display a conditions row; absence of the field is treated as unknown.
- **FR-007**: The system MUST NOT store a structured conditions object in which all four booleans are false, as this carries no information.

### Key Entities

- **EntryConditions**: Represents structured entry requirements for a giveaway. Attributes: `follow` (boolean), `repost` (boolean), `reply` (boolean), `other` (boolean), `note` (optional string in Japanese).
- **GiveawayPost**: Updated to replace the free-text `conditions` string with a structured `entryConditions` object.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can identify the required entry actions for any giveaway card within 3 seconds, without reading free-text.
- **SC-002**: 100% of newly analyzed giveaway tweets produce structured conditions rather than a free-text string.
- **SC-003**: The AI analyzer correctly classifies entry conditions for at least 90% of typical Japanese giveaway tweets (フォロー, RT, リプライ patterns).
- **SC-004**: No existing page functionality (filtering, sorting, deadline display) is broken by this change.
- **SC-005**: Giveaway cards with legacy (unstructured) records display without errors or visual anomalies.

## Assumptions

- The four categories (フォロー, リポスト, リプライ, その他) cover the overwhelming majority of real-world Pokémon card giveaway entry conditions on Japanese Twitter.
- Active giveaways last at most a few weeks, so legacy records without structured conditions will age out without requiring a data migration.
- The supplementary note field will always be in Japanese, consistent with the tweet language.
- Mobile responsiveness of the badge row is required (badges must wrap cleanly on narrow screens).
- The Bedrock AI model (Claude Haiku) is capable of reliably extracting structured conditions from Japanese tweet text given an updated tool schema.

# Research: Giveaway Entry Condition Badges

**Branch**: `024-giveaway-entry-badges` | **Date**: 2026-05-27

## Decision 1: Structured type representation

**Decision**: Four boolean fields (`follow`, `repost`, `reply`, `other`) + optional `note` string, stored as a nested object `entryConditions` in DynamoDB.

**Rationale**: The four categories cover virtually all real-world Japanese Pokémon card giveaway entry patterns. Boolean flags are directly consumable by the UI without parsing, and the optional `note` handles edge cases (specific hashtags, multi-account follows, etc.).

**Alternatives considered**:
- Free-text string (current) — not machine-readable, cannot render badges without NLP
- Enum array (e.g. `["follow", "repost"]`) — requires presence check on each render; booleans are simpler
- Separate DynamoDB attributes per condition — unnecessarily explodes the schema

---

## Decision 2: Inactive badge visibility

**Decision**: Show all four badges always; inactive ones are visually dimmed (gray/transparent).

**Rationale**: Confirmed by user. Showing all four provides a consistent visual rhythm and makes it immediately clear what is NOT required, which is as informative as what IS required.

**Alternatives considered**:
- Show only active badges — cleaner but loses the "not required" signal

---

## Decision 3: Backward compatibility strategy

**Decision**: Old records (with `conditions: string`) show no conditions row. No migration.

**Rationale**: Active giveaways expire within days to weeks. The `entryConditions` field is optional; absence means "unknown" and the UI simply omits the row. This requires zero migration effort.

**Alternatives considered**:
- One-time re-analysis of all active records — adds operational complexity for short-lived benefit
- Display old `conditions` string as fallback — adds dual-path code complexity

---

## Decision 4: AI output — save only if at least one boolean true

**Decision**: In `save-giveaway.ts`, only persist `entryConditions` when at least one of the four booleans is true.

**Rationale**: An all-false object (no conditions extracted) carries no information. Storing it would make the UI show four gray badges on a card where conditions are genuinely unknown, which is misleading.

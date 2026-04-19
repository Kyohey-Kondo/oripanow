# Research: Atari Card Info

**Feature**: 013-atari-card-info  
**Date**: 2026-04-19

## Decision 1: Detection Method

**Decision**: Extend the existing Claude tool_use schema in `apps/batch/src/parse.ts` by adding `atariCards` as an optional string array field within each entry of the `items` array.

**Rationale**:
- Same pattern as `lastOnePrizeName` (012), proven to work with Bedrock Converse tool_use.
- Claude handles all Japanese phrasing variants natively with a rich description in the tool schema.
- Zero additional Bedrock API calls — part of the same existing call.
- String array (`string[]`) is the natural representation: tweets often list multiple atari cards.

**Alternatives considered**:
- Single string (comma-separated): Rejected — harder to display, sort, or filter in future.
- Regex extraction: Rejected — fragile against phrasing variants.

## Decision 2: Atari Phrasing Patterns to Cover

The tool schema description will explicitly name these patterns so Claude recognizes them:

| Pattern | Example |
|---|---|
| `あたり` / `当たり` | あたり: ピカチュウex SAR |
| `封入あたり` / `封入当たり` | 封入あたり ピカチュウex SAR |
| `確定あたり` / `確定当たり` | 確定あたり リザードンex |
| `大当たり` | 大当たり ミュウツーex SAR |
| `封入内容` | 封入内容: ピカチュウex SAR / リザードンex |
| `豪華あたり` | 豪華あたり ブラッキーex |
| カード名の列挙（文脈で判断） | リザードンex SAR / ピカチュウex SAR など |

## Decision 3: Data Storage

**Decision**: Add `atariCards?: string[]` to `OripaPostItem` in `packages/db/schema/index.ts`. Stored as a DynamoDB List of Strings. No new GSI required.

**Rationale**:
- No query pattern on atari cards in v1 (P2 filter is deferred).
- DynamoDB List type maps naturally to `string[]` via DocumentClient.
- Schema-less: old records without the field return `undefined`, matching `?: string[]`.

## Decision 4: Per-Tier vs. Shared Atari Cards

**Decision**: `atariCards` is placed at the item level in the tool schema. When a tweet's atari cards are not clearly tier-specific (shared across all tiers), Claude is instructed to copy them to every item. Claude makes this judgment from context.

**Rationale**: Consistent with how `lastOnePrizeName` is handled per-tier; Claude is capable of inferring sharing from tweet structure.

## Decision 5: UI Display

**Decision**: Display `atariCards` as a comma-separated list within the table cell. If the list has more than 3 items, show the first 3 followed by `… (+N more)` to prevent row overflow.

**Rationale**:
- Keeps table layout compact.
- Most tweets list 1–3 cards; truncation handles edge cases gracefully.
- Full list is always accessible via the tweet link.

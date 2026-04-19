# Research: Last One Prize Detection

**Feature**: 012-last-one-prize-detection  
**Date**: 2026-04-19

## Decision 1: Detection Method

**Decision**: Extend the existing Claude tool_use schema in `apps/batch/src/parse.ts` by adding `lastOnePrizeName` as an optional string field within each entry of the `items` array.

**Rationale**:
- The pipeline already uses `ConverseCommand` with `toolChoice: { any: {} }`, forcing Claude to always return structured JSON via the `classify_oripa_tweet` tool.
- Adding one field to the JSON schema is sufficient — Claude's Japanese language understanding covers all phrasing variants ("ラストワン賞", "ラス1賞", "最後の1口は〇〇", "ラストワン") without any regex or post-processing.
- Zero additional Bedrock API calls — the extraction is part of the same existing call.
- The tool_use approach is idempotent with the existing pattern.

**Alternatives considered**:
- Regex on tweet text: Rejected — fragile against phrasing variants, requires ongoing maintenance.
- Separate Bedrock call for prize extraction: Rejected — doubles cost and latency for no benefit when the existing call already reads full tweet text.

## Decision 2: Data Storage

**Decision**: Add `lastOnePrizeName?: string` to `OripaPostItem` in `packages/db/schema/index.ts`. Store it as a plain DynamoDB attribute (no new index required).

**Rationale**:
- No query pattern requires filtering by last one prize name — it's display-only for v1.
- DynamoDB's schema-less model means no migration needed; old records without the field return `undefined` naturally.
- No GSI changes needed.

**Alternatives considered**:
- Separate DynamoDB table/item for prize data: Rejected — over-engineering; a single optional field on the existing record is sufficient.

## Decision 3: Per-Tier Prize Association

**Decision**: When a tweet has multiple oripa tiers (multiple `items`), Claude is asked to associate the correct `lastOnePrizeName` with each tier's entry in the `items` array.

**Rationale**:
- The existing tool schema already has one object per price tier in `items`.
- Adding `lastOnePrizeName` at the item level (not at the top level) naturally supports per-tier prizes.
- If only one tier has a prize and the tweet doesn't clearly associate it with a specific tier, Claude can use context clues; ambiguous cases result in `null`/omission (acceptable per FR-003).

## Decision 4: Type Propagation

**Decision**: `lastOnePrizeName` will be added to:
1. `OripaItem` in `parse.ts` (analysis output)
2. `OripaPostItem` in `packages/db/schema/index.ts` (storage)
3. `OripaPostSummary` in `packages/types/src/index.ts` (web display type)

**Rationale**: The field flows through the existing pipeline stages without any structural changes needed.

## Decision 5: UI Display

**Decision**: Display `lastOnePrizeName` as an inline label (e.g., "🏆 ラストワン賞: {name}") within the oripa card on both the top page and shop detail page. No filter UI in v1 (P2 deferred).

**Rationale**:
- Inline label is the simplest non-intrusive addition to existing card layout.
- P2 (filter/highlight) deferred to keep scope minimal for v1.

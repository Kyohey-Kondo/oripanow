# Implementation Plan: Atari Card Info

**Branch**: `013-atari-card-info` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the existing Claude-based tweet analysis pipeline to extract a list of "atari" (hit) card names from oripa tweets. The change follows the same pattern as 012-last-one-prize-detection: Bedrock tool schema → batch types → DynamoDB item type → web display type → UI. The key difference is `atariCards` is a `string[]` (list) rather than a single string.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: `@aws-sdk/client-bedrock-runtime` (Converse API + tool_use), `@aws-sdk/lib-dynamodb`, Next.js 15 (App Router)  
**Storage**: DynamoDB `oripa-posts` table — List of Strings attribute; no migration needed  
**Testing**: Manual verification via `backfill-last-one-prize.ts` pattern + analyze Lambda invocation  
**Target Platform**: Lambda Node.js 22.x (batch), Next.js SSR (web)  
**Project Type**: Monorepo — batch Lambda + Next.js web app  
**Performance Goals**: No extra Bedrock API calls; analyze latency increase ≤ 20%  
**Constraints**: Idempotent PutCommand already handles re-runs; same pattern applies  
**Scale/Scope**: Same as existing pipeline (~25 stores, hourly batch)

## Constitution Check

Constitution is a template (not filled out). No gate violations. Changes are additive and localized to the same 6-file surface as 012.

## Project Structure

### Documentation (this feature)

```text
specs/013-atari-card-info/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
packages/db/schema/index.ts           ← add atariCards?: string[] to OripaPostItem
packages/types/src/index.ts           ← add atariCards?: string[] to OripaPostSummary
apps/batch/src/parse.ts               ← add atariCards to OripaItem + Bedrock tool schema
apps/batch/src/save.ts                ← pass atariCards when constructing OripaPostItem
apps/web/lib/posts.ts                 ← add atariCards to mapToSummary
apps/web/app/page.tsx                 ← display atariCards column on top page
apps/web/app/shops/[storeId]/page.tsx ← display atariCards column on shop detail page
```

## Implementation Steps

### Step 1 — Bedrock Tool Schema + Parse Type (apps/batch/src/parse.ts)

1. Add `atariCards?: string[]` to the `OripaItem` type.
2. Add `atariCards` property to `TOOL.toolSpec.inputSchema.json.properties.items.items.properties`:
   ```json
   "atariCards": {
     "type": "array",
     "items": { "type": "string" },
     "description": "List of hit card names (あたりカード) for this oripa tier. Detect any of these patterns: 'あたり', '当たり', '封入あたり', '封入当たり', '確定あたり', '確定当たり', '大当たり', '豪華あたり', '封入内容'. Extract each card name as a separate string (e.g. ['ピカチュウex SAR', 'リザードンex SAR']). If atari cards are shared across all tiers in the tweet, copy the full list to every tier's entry. Omit this field entirely if no atari cards are mentioned."
   }
   ```

### Step 2 — Storage Type (packages/db/schema/index.ts)

Add `atariCards?: string[]` to `OripaPostItem`.

### Step 3 — Save Layer (apps/batch/src/save.ts)

Pass `atariCards` using conditional spread (same pattern as `lastOnePrizeName`):
```ts
...(tier.atariCards && tier.atariCards.length > 0 ? { atariCards: tier.atariCards } : {}),
```

### Step 4 — Display Type + Mapping (packages/types/src/index.ts + apps/web/lib/posts.ts)

- Add `atariCards?: string[]` to `OripaPostSummary`.
- Add to `mapToSummary`:
  ```ts
  ...(p.atariCards && p.atariCards.length > 0 && { atariCards: p.atariCards }),
  ```

### Step 5 — Web UI (apps/web/app/page.tsx + shops/[storeId]/page.tsx)

Add「あたり」column header and cell. Truncate at 3 items:
```tsx
// Helper (inline or extracted)
function formatAtariCards(cards: string[]): string {
  if (cards.length <= 3) return cards.join(' / ');
  return cards.slice(0, 3).join(' / ') + ` … (+${cards.length - 3})`;
}

// In table cell:
{s.atariCards && s.atariCards.length > 0 ? formatAtariCards(s.atariCards) : '—'}
```

### Step 6 — Backfill Script

Create `scripts/backfill-atari-cards.ts` following the same pattern as `backfill-last-one-prize.ts`:
- Scan tweets (configurable LIMIT, default 20)
- Re-analyze with Bedrock
- UpdateItem on oripa-posts where `atariCards` is detected

### Step 7 — Verify with Playwright / curl

Reload the top page and confirm the「あたり」column renders correctly.

## Rollout Notes

- Existing DynamoDB records without `atariCards` are unaffected (`undefined` is correct state).
- To test immediately: run `backfill-atari-cards.ts` + reload dev server.
- Note: `mapToSummary` must be updated (lesson from 012 — forgetting this caused data not to appear in UI).

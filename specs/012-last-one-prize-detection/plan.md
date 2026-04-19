# Implementation Plan: Last One Prize Detection

**Branch**: `012-last-one-prize-detection` | **Date**: 2026-04-19 | **Spec**: [spec.md](./spec.md)

## Summary

Extend the existing Claude-based tweet analysis pipeline to detect and store the "last one prize" (ラストワン賞) product name from oripa tweets. The change propagates through four layers: Bedrock tool schema → batch types → DynamoDB item type → web display type → UI. No new infrastructure, no new API calls, no DynamoDB migrations.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: `@aws-sdk/client-bedrock-runtime` (Converse API + tool_use), `@aws-sdk/lib-dynamodb`, Next.js 15 (App Router)  
**Storage**: DynamoDB `oripa-posts` table — schema-less; no migration needed  
**Testing**: Manual verification via `backfill.ts` + `analyze` Lambda invocation  
**Target Platform**: Lambda Node.js 22.x (batch), Next.js SSR (web)  
**Project Type**: Monorepo — batch Lambda + Next.js web app  
**Performance Goals**: Analyze latency increase ≤ 20% (per SC-004); no extra API calls  
**Constraints**: Must remain idempotent (PutCommand with ConditionExpression already handles this)  
**Scale/Scope**: Same as existing pipeline (~25 stores, hourly batch)

## Constitution Check

Constitution is a template (not filled out for this project). No gate violations identified. Changes are additive and localized.

## Project Structure

### Documentation (this feature)

```text
specs/012-last-one-prize-detection/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
packages/db/schema/index.ts           ← add lastOnePrizeName? to OripaPostItem
packages/types/src/index.ts           ← add lastOnePrizeName? to OripaPostSummary
apps/batch/src/parse.ts               ← add field to OripaItem + Bedrock tool schema
apps/batch/src/save.ts                ← pass lastOnePrizeName when constructing OripaPostItem
apps/web/app/page.tsx                 ← display lastOnePrizeName in top page oripa card
apps/web/app/shops/[storeId]/page.tsx ← display lastOnePrizeName in shop detail oripa card
```

## Implementation Steps

### Step 1 — Bedrock Tool Schema + Parse Type (apps/batch/src/parse.ts)

1. Add `lastOnePrizeName?: string` to the `OripaItem` type.
2. Add `lastOnePrizeName` property to `TOOL.toolSpec.inputSchema.json.properties.items.items.properties`:
   ```json
   "lastOnePrizeName": {
     "type": "string",
     "description": "Product name of the last-one prize (ラストワン賞) for this oripa tier, if mentioned in the tweet. Omit if no last-one prize is stated."
   }
   ```

### Step 2 — Storage Type (packages/db/schema/index.ts)

Add `lastOnePrizeName?: string` to `OripaPostItem`.

### Step 3 — Save Layer (apps/batch/src/save.ts)

In `saveOripaPost`, pass `tier.lastOnePrizeName` when constructing the `post` object:
```ts
...(tier.lastOnePrizeName ? { lastOnePrizeName: tier.lastOnePrizeName } : {}),
```
Use conditional spread to keep the attribute absent (not `null`) when not present — consistent with how `price` and `stockCount` are handled.

### Step 4 — Display Type (packages/types/src/index.ts)

Add `lastOnePrizeName?: string` to `OripaPostSummary`.

### Step 5 — Web UI (apps/web/app/page.tsx + shops/[storeId]/page.tsx)

In the oripa card render, add a conditional line:
```tsx
{post.lastOnePrizeName && (
  <p style={{ fontSize: '0.8em', color: '#b45309' }}>
    🏆 ラストワン賞: {post.lastOnePrizeName}
  </p>
)}
```

### Step 6 — Verify with Playwright

Take a screenshot of the top page and shop detail page to confirm the prize name renders correctly on a post that has one.

## Rollout Notes

- Existing DynamoDB records are unaffected (no backfill needed — `undefined` is the correct state for records before this feature).
- To test immediately: run `backfill.ts` + invoke `dev-oripa-now-analyze` Lambda, then reload the dev server.

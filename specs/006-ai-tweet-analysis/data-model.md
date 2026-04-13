# Data Model: AI Tweet Analysis

**Branch**: `006-ai-tweet-analysis` | **Date**: 2026-04-13

## No New Tables Required

All entities already exist. This feature reads from `tweets` and `stores`, writes to `oripa-posts`, and updates `tweets`.

---

## Entity: TweetItem (modified — isProcessed + processStatus update)

After successful analysis:

| Field | Before | After |
|-------|--------|-------|
| `isProcessed` | `false` | `true` |
| `processStatus` | `"UNPROCESSED"` | `undefined` (attribute removed) |

After failed analysis: **no change** — tweet stays UNPROCESSED for retry.

---

## Entity: OripaPostItem (written by this feature)

**Table**: `${DEPLOY_ENV}-oripa-posts`

| Field | Type | Source |
|-------|------|--------|
| `postId` | `string` (ULID) | Generated at write time |
| `storeId` | `string` (ULID) | From TweetItem |
| `tweetId` | `string` | From TweetItem |
| `status` | `"on_sale" \| "upcoming" \| "sold_out"` | AI classification |
| `price` | `number \| undefined` | AI extraction (JPY) |
| `stockCount` | `number \| undefined` | AI extraction |
| `saleAt` | `string` YYYY-MM-DD | AI extraction; defaults to tomorrow JST if upcoming without date |
| `rawText` | `string` | TweetItem.content |
| `createdAt` | `string` ISO 8601 | Write time |
| `updatedAt` | `string` ISO 8601 | Write time |
| `areaStatusDate` | `string` | `"${area}#${status}#${saleAt}"` — GSI1 partition key |
| `storeName` | `string` | Denormalized from StoreItem |
| `storeAddress` | `string \| undefined` | Denormalized from StoreItem |

**GSI1** (`oripaPostsByAreaStatusDate`): `areaStatusDate` → `createdAt` — top page query

---

## AI Output Schema (tool_use)

The Anthropic tool definition enforces this shape:

```typescript
type AnalysisResult = {
  status: 'on_sale' | 'upcoming' | 'sold_out' | 'not_oripa';
  price?: number;        // JPY, integer
  stockCount?: number;   // integer
  saleAt?: string;       // YYYY-MM-DD JST; required for on_sale/upcoming/sold_out
};
```

If `status === 'not_oripa'`, no OripaPost is written.

---

## Access Patterns

| Pattern | Operation | Key |
|---------|-----------|-----|
| Read UNPROCESSED queue | `Query` GSI2 on tweets | `processStatus = "UNPROCESSED"`, `Limit: 50` |
| Read store metadata | `GetItem` stores | `storeId` |
| Write OripaPost | `PutItem` oripa-posts | `postId` (ULID) |
| Mark tweet processed | `UpdateItem` tweets | `id` (ULID) — set `isProcessed=true`, remove `processStatus` |

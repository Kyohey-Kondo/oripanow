# Data Model: Atari Card Info

**Feature**: 013-atari-card-info  
**Date**: 2026-04-19

## Changed Types

### `OripaItem` (apps/batch/src/parse.ts)

```ts
export type OripaItem = {
  price?: number;
  stockCount?: number;
  lastOnePrizeName?: string;   // existing (012)
  atariCards?: string[];       // NEW: list of hit card names for this tier
};
```

### `OripaPostItem` (packages/db/schema/index.ts)

```ts
export type OripaPostItem = {
  postId: string;
  storeId: string;
  tweetId: string;
  status: "on_sale" | "sold_out" | "upcoming";
  price?: number;
  stockCount?: number;
  lastOnePrizeName?: string;   // existing (012)
  atariCards?: string[];       // NEW: stored as DynamoDB List of Strings
  saleAt: string;
  rawText: string;
  createdAt: string;
  updatedAt: string;
  areaStatusDate: string;
  storeName: string;
  storeAddress?: string;
};
```

### `OripaPostSummary` (packages/types/src/index.ts)

```ts
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  saleAt: string;
  tweetId: string;
  twitterUsername: string;
  price?: number;
  stockCount?: number;
  lastOnePrizeName?: string;   // existing (012)
  atariCards?: string[];       // NEW: displayed in UI when present
}
```

## Bedrock Tool Schema Change (apps/batch/src/parse.ts)

The `items` array in the `classify_oripa_tweet` tool gains one new optional property:

```json
"atariCards": {
  "type": "array",
  "items": { "type": "string" },
  "description": "List of hit card names (あたりカード) for this oripa tier. Detect any of these patterns: 'あたり', '当たり', '封入あたり', '封入当たり', '確定あたり', '確定当たり', '大当たり', '豪華あたり', '封入内容'. Extract each card name as a separate string (e.g. ['ピカチュウex SAR', 'リザードンex SAR']). If atari cards are shared across all tiers in the tweet, copy the full list to every tier's entry. Omit this field entirely if no atari cards are mentioned."
}
```

## DynamoDB Impact

- **No schema migration**: Schema-less; old records without `atariCards` return `undefined`.
- **No new GSI**: Display-only in v1; no filter query pattern requires indexing.
- **Storage format**: DynamoDB List of Strings via `@aws-sdk/lib-dynamodb` DocumentClient (automatic marshalling from `string[]`).

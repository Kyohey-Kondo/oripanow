# Data Model: Last One Prize Detection

**Feature**: 012-last-one-prize-detection  
**Date**: 2026-04-19

## Changed Types

### `OripaItem` (apps/batch/src/parse.ts)

```ts
export type OripaItem = {
  price?: number;
  stockCount?: number;
  lastOnePrizeName?: string;  // NEW: product name of the last-one prize for this tier
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
  lastOnePrizeName?: string;  // NEW: stored as plain DynamoDB attribute, absent when null
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
  lastOnePrizeName?: string;  // NEW: displayed in UI when present
}
```

## Bedrock Tool Schema Change (apps/batch/src/parse.ts)

The `items` array in the `classify_oripa_tweet` tool gains one new optional property:

```json
"lastOnePrizeName": {
  "type": "string",
  "description": "Product name of the last-one prize (ラストワン賞) for this oripa tier, if mentioned in the tweet. Omit if no last-one prize is stated."
}
```

## DynamoDB Impact

- **No schema migration required**: DynamoDB is schema-less; existing records without `lastOnePrizeName` return `undefined` on read, matching the `?: string` TypeScript type.
- **No new GSI**: The field is display-only in v1; no query/filter patterns require it to be indexed.
- **No table changes**: The existing `dev-oripa-posts` / `prod-oripa-posts` tables are unchanged structurally.

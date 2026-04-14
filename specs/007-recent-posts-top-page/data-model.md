# Data Model: Recent On-Sale Posts on Top Page

## No DynamoDB Schema Changes

This feature makes **no changes** to DynamoDB tables, GSIs, or CDK infrastructure.  
All changes are in the application layer only.

---

## Modified Type: `OripaPostSummary` (`packages/types/src/index.ts`)

### Before

```ts
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  createdAt: string;   // ISO 8601 — when the tweet was AI-analyzed
  price?: number;
  stockCount?: number;
}
```

### After

```ts
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  createdAt: string;   // ISO 8601 — when the tweet was AI-analyzed
  saleAt: string;      // YYYY-MM-DD (JST) — the advertised sale date from the tweet
  price?: number;
  stockCount?: number;
}
```

**Why `saleAt` is added**: The top page displays it in a "Sale Date" column so users can assess how fresh the information is.

---

## New Functions: `packages/db/queries/oripa-posts.ts`

### `getRecentDatesJST(days?: number): string[]`

Returns the last `days` dates (default 14) as `"YYYY-MM-DD"` strings in JST, newest first.

| Param  | Type     | Default | Description               |
|--------|----------|---------|---------------------------|
| `days` | `number` | `14`    | How many days to look back |

**Returns**: `string[]` — e.g. `["2026-04-14", "2026-04-13", ..., "2026-04-01"]`

### `queryRecentOnSalePostsByArea(client, tableName, area, days?): Promise<OripaPostItem[]>`

Queries on-sale posts for a single area across the last `days` days in parallel.

| Param       | Type                    | Description                      |
|-------------|-------------------------|----------------------------------|
| `client`    | `DynamoDBDocumentClient`| AWS SDK DocumentClient           |
| `tableName` | `string`                | DynamoDB table name              |
| `area`      | `string`                | `"tokyo"` or `"omiya"`           |
| `days`      | `number` (default 14)   | Lookback window in days          |

**Returns**: `Promise<OripaPostItem[]>` — flat array of posts across all queried dates

**Behaviour**: Calls `queryOnSalePostsByDate` once per date via `Promise.all`. Empty dates return `[]` and are flattened away.

---

## Updated Function: `mapToSummary` (`apps/web/lib/posts.ts`)

Must be updated to include `saleAt` in the mapped output.

```ts
// Before
return posts.map((p) => ({
  postId: p.postId,
  storeId: p.storeId,
  storeName: p.storeName,
  createdAt: p.createdAt,
  ...(p.price !== undefined && { price: p.price }),
  ...(p.stockCount !== undefined && { stockCount: p.stockCount }),
}));

// After — add saleAt
return posts.map((p) => ({
  postId: p.postId,
  storeId: p.storeId,
  storeName: p.storeName,
  createdAt: p.createdAt,
  saleAt: p.saleAt,
  ...(p.price !== undefined && { price: p.price }),
  ...(p.stockCount !== undefined && { stockCount: p.stockCount }),
}));
```

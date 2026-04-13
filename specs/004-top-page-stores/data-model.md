# Data Model: Top Page — Stores with Same-Day Stock

**Feature**: 004-top-page-stores  
**Date**: 2026-04-13

## Existing Entities (no changes required)

These are already defined in `packages/db/schema/index.ts` and are used as-is.

### OripaPostItem (DynamoDB record)

The primary entity fetched from DynamoDB. The top page query reads these via GSI1.

| Field | Type | Notes |
|-------|------|-------|
| `PK` | `string` | `POST#<id>` |
| `SK` | `string` | `POST#<id>` |
| `type` | `"POST"` | Discriminator |
| `id` | `string` | Unique post ID |
| `storeId` | `string` | Foreign key to Store |
| `status` | `"on_sale" \| "sold_out" \| "upcoming"` | Filter: only `on_sale` shown |
| `saleAt` | `string?` | ISO date string (YYYY-MM-DD in JST); top page filters on this |
| `createdAt` | `string` | ISO timestamp; used for sort (newest first) |
| `storeName` | `string` | Denormalized — display directly without JOIN |
| `GSI1PK` | `string` | `<area>#<status>` — query key |
| `GSI1SK` | `string` | `<saleAtDate>#<createdAt>` — sort/filter key |

**Key constraint**: `saleAt` must be populated (non-null) for a post to appear in the GSI1 top-page query. Posts without a `saleAt` date will never match "today's" filter.

### StoreItem (DynamoDB record)

Not directly fetched on the top page — store name is denormalized into `OripaPostItem.storeName`.

---

## New DTO (UI Layer)

### OripaPostSummary

A minimal, serializable shape passed from the Next.js Server Component to the UI. Contains only what the top page needs to render each store entry.

```typescript
// packages/types/src/index.ts
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  /** ISO timestamp of when this post was created (for display and sort ordering) */
  createdAt: string;
  /** Price in JPY, if known */
  price?: number;
  /** Stock count, if known */
  stockCount?: number;
}
```

**Mapping from `OripaPostItem`**:
| OripaPostItem field | OripaPostSummary field |
|---------------------|----------------------|
| `id` | `postId` |
| `storeId` | `storeId` |
| `storeName` | `storeName` |
| `createdAt` | `createdAt` |
| `price` | `price` |
| `stockCount` | `stockCount` |

---

## Query Access Pattern

### Top Page Query (GSI1)

```
Table:           oripa-now
Index:           GSI1 (byAreaStatus)
Operation:       Query (per area)
KeyCondition:    GSI1PK = "<area>#on_sale"
                 AND GSI1SK begins_with "<YYYY-MM-DD>"
ScanIndexForward: false   (newest first within area)
Limit:           50 per area (merge, then global cap at 50)
```

**Areas queried**: `["tokyo", "omiya"]`  
**Date**: Today in JST, formatted as `YYYY-MM-DD`

### Post-query processing (in-memory)

1. Merge results from all areas into one array
2. Sort by `createdAt` descending (cross-area global sort)
3. Deduplicate: keep only the first (newest) post per `storeId`
4. Cap total results at 50
5. Map `OripaPostItem[]` → `OripaPostSummary[]`

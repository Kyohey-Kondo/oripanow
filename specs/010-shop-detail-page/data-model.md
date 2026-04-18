# Data Model: Shop Detail Page

## Existing entities used (no schema changes)

### OripaPostItem (oripa-posts table)

Used as-is. Query via **GSI2** (`IndexName: 'GSI2'`):
- PK: `storeId` (string)
- SK: `createdAt` (ISO 8601 string)
- Filter: last 14 days (`createdAt >= cutoffISO`)
- Sort: `ScanIndexForward: false` (newest first)

### StoreItem (stores table)

Single `GetItem` by `storeId` to resolve:
- `name` → page heading
- `twitterUsername` → oEmbed URL construction

### OripaPostSummary (existing type in `@oripa-now/types`)

Reused unchanged for the shop detail page. No new types needed.

## New query function

**Location**: `packages/db/queries/oripa-posts.ts`

```
queryRecentPostsByStore(client, tableName, storeId, days = 14): Promise<OripaPostItem[]>
```

- `IndexName`: `GSI2`
- `KeyConditionExpression`: `storeId = :storeId AND createdAt >= :cutoff`
- `ExpressionAttributeValues`: `{ ':storeId': storeId, ':cutoff': cutoffISO }`
- `ScanIndexForward`: false
- `Limit`: 100

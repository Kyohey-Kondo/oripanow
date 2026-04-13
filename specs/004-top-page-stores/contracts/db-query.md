# Contract: DB Query Layer

**Package**: `packages/db/queries/oripa-posts.ts`  
**Feature**: 004-top-page-stores

## Function: `queryOnSalePostsByDate`

Fetches oripa posts with `status=on_sale` for a given area and sale date from DynamoDB GSI1.

```typescript
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { OripaPostItem } from "../schema/index.js";

/**
 * Query GSI1 for on-sale posts in a given area for the specified date.
 * Results are returned newest-first (ScanIndexForward=false).
 * At most `limit` items are returned.
 */
export async function queryOnSalePostsByDate(
  client: DynamoDBDocumentClient,
  tableName: string,
  area: string,
  dateJST: string,    // "YYYY-MM-DD"
  limit?: number      // default 50
): Promise<OripaPostItem[]>
```

**Behavior**:
- Queries GSI1 with `KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)"`.
  - `:pk` = `"${area}#on_sale"`
  - `:skPrefix` = `dateJST` (e.g., `"2026-04-13"`)
- `ScanIndexForward: false` — returns items newest-first within the area.
- Returns at most `limit` items (default 50).
- Returns `[]` if no matching items.

**Error handling**:
- On DynamoDB error, propagates the error to the caller (no silent swallowing).

---

## Function: `getTodayJST`

Returns today's date in JST as a `YYYY-MM-DD` string.

```typescript
/**
 * Returns today's date in Japan Standard Time (UTC+9) as "YYYY-MM-DD".
 */
export function getTodayJST(): string
```

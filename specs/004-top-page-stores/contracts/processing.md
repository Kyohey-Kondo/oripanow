# Contract: Post Processing Functions

**File**: `apps/web/lib/posts.ts`  
**Feature**: 004-top-page-stores

These are **pure functions** — no I/O, no side effects. They accept arrays and return arrays. All unit tests target these functions.

---

## Function: `sortNewestFirst`

```typescript
import { OripaPostItem } from "@oripa-now/db";

/**
 * Sort posts by createdAt descending (newest first).
 * Returns a new array; does not mutate the input.
 */
export function sortNewestFirst(posts: OripaPostItem[]): OripaPostItem[]
```

**Behavior**:
- Compares `post.createdAt` as ISO strings (lexicographic sort is correct for ISO 8601).
- Returns a new sorted array.

---

## Function: `deduplicateByStore`

```typescript
/**
 * Keep only the first (newest) post per storeId.
 * Input must be sorted newest-first (sortNewestFirst) before calling.
 * Returns a new array; does not mutate the input.
 */
export function deduplicateByStore(posts: OripaPostItem[]): OripaPostItem[]
```

**Behavior**:
- Single O(n) pass using a `Set<string>` of seen `storeId` values.
- First occurrence of each `storeId` wins (newest, given sorted input).

---

## Function: `capResults`

```typescript
/**
 * Limit the result list to at most `limit` items.
 */
export function capResults(posts: OripaPostItem[], limit: number): OripaPostItem[]
```

---

## Function: `mapToSummary`

```typescript
import { OripaPostSummary } from "@oripa-now/types";

/**
 * Map OripaPostItem[] to OripaPostSummary[] for the UI layer.
 */
export function mapToSummary(posts: OripaPostItem[]): OripaPostSummary[]
```

---

## Orchestrator: `getTodayOnSalePosts`

```typescript
/**
 * Top-level function called by the Next.js Server Component.
 * Queries DynamoDB, applies all processing, and returns UI-ready summaries.
 * Returns [] if no stores have same-day on-sale stock.
 */
export async function getTodayOnSalePosts(): Promise<OripaPostSummary[]>
```

**Internal flow**:
```
1. getTodayJST()                                    → dateJST
2. Promise.all(AREAS.map(area →
     queryOnSalePostsByDate(client, TABLE, area, dateJST, 50)
   ))                                               → OripaPostItem[][]
3. flat()                                           → OripaPostItem[]
4. sortNewestFirst(...)                             → sorted
5. deduplicateByStore(...)                          → deduplicated
6. capResults(..., MAX_RESULTS=50)                  → capped
7. mapToSummary(...)                                → OripaPostSummary[]
```

**Constants**:
- `AREAS = ["tokyo", "omiya"]`
- `MAX_RESULTS = 50`

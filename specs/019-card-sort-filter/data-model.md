# Data Model: Card Sort and Filter

**Feature**: 019-card-sort-filter
**Date**: 2026-05-07

## No Schema Changes

This feature has no DynamoDB schema changes. All sort and filter logic operates on existing `OripaPostSummary` fields already present in the type.

---

## New Type Definitions (TypeScript, in `apps/web/lib/posts.ts` or inline in page)

### SortOption

```typescript
export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
export const DEFAULT_SORT: SortOption = 'newest';
export const VALID_SORTS: SortOption[] = ['newest', 'price_asc', 'price_desc', 'stock_asc', 'stock_desc'];
```

### FilterOption

```typescript
export type FilterOption = 'last_one' | 'hit_card' | 'both';
export const VALID_FILTERS: FilterOption[] = ['last_one', 'hit_card', 'both'];
// No filter = undefined (param absent from URL)
```

---

## Sort Logic (field-level rules)

| SortOption   | Primary Sort Key      | Undefined Handling       |
|--------------|-----------------------|--------------------------|
| newest       | tweetId DESC (BigInt) | N/A (always present)     |
| price_asc    | price ASC             | undefined → end of list  |
| price_desc   | price DESC            | undefined → end of list  |
| stock_asc    | stockCount ASC        | undefined → end of list  |
| stock_desc   | stockCount DESC       | undefined → end of list  |

---

## Filter Logic (field-level rules)

| FilterOption | Condition                                                           |
|--------------|---------------------------------------------------------------------|
| last_one     | `lastOnePrizeName !== undefined && lastOnePrizeName !== ''`        |
| hit_card     | `atariCards !== undefined && atariCards.length > 0`                |
| both         | Both last_one AND hit_card conditions true simultaneously           |
| (no filter)  | No filtering applied — all items pass through                      |

---

## URL Query Parameters

| Param  | Type   | Valid Values                                          | Default   |
|--------|--------|-------------------------------------------------------|-----------|
| sort   | string | newest, price_asc, price_desc, stock_asc, stock_desc  | newest    |
| filter | string | last_one, hit_card, both                             | (absent)  |
| area   | string | existing area values (unchanged)                      | (absent)  |
| page   | string | integer string 1–3                                   | 1         |

Invalid values for `sort` and `filter` fall back to defaults silently.

---

## Processing Pipeline (updated)

```
getTodayOnSalePosts(area)
  → sortNewestFirst + dedup + cap(60)   [unchanged in data layer]
  → applySort(sortOption)               [new, in page.tsx]
  → applyFilter(filterOption)           [new, in page.tsx]
  → paginate(pageIndex, PAGE_SIZE)      [unchanged]
  → render OripaCard[]                  [unchanged]
```

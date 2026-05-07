# Research: Card Sort and Filter

**Feature**: 019-card-sort-filter
**Date**: 2026-05-07

## Decision 1: Sort/Filter Execution Location

**Decision**: Apply sort and filter on the server side during SSR (in `page.tsx` after fetching data from `getTodayOnSalePosts()`), not client-side.

**Rationale**: The existing page is a Next.js Server Component with no client-side state. Sort and filter parameters are stored in the URL (`searchParams`), which is already the pattern used for `area` and `page`. Adding client-side hydration would require converting the page to a Client Component, increasing complexity significantly. Since the data cap is 60 items, server-side in-memory sort is trivially fast.

**Alternatives considered**:
- Client-side sort with useState/useEffect: Rejected — would require "use client" on the page and break the existing SSR-first architecture.
- DynamoDB-level sort via new GSI: Rejected — price and stockCount are not indexed. Adding new GSIs for these fields would be over-engineering for a 60-item in-memory sort.

---

## Decision 2: Where Sort/Filter Functions Live

**Decision**: Add `sortPosts()` and `filterPosts()` pure functions directly in `apps/web/lib/posts.ts`, alongside the existing `sortNewestFirst`, `deduplicateByPriceAndStock`, and `capResults` functions.

**Rationale**: This file is already the processing pipeline for posts. Adding sort/filter functions there keeps the pattern consistent and makes them independently testable.

**Alternatives considered**:
- New file `apps/web/lib/sort-filter.ts`: Rejected — unnecessary fragmentation for 2 small functions.

---

## Decision 3: Sort Option Values

**Decision**: Use string literals as sort option values: `newest` (default), `price_asc`, `price_desc`, `stock_asc`, `stock_desc`.

**Rationale**: Maps directly to URL query params (`?sort=price_asc`). Simple to validate and extend.

**Handling of undefined values**: Cards with undefined `price` sort to the end for price sorts. Cards with undefined `stockCount` sort to the end for stock sorts. Treats `undefined` as "infinity" for ascending sorts and "-infinity" for descending sorts.

---

## Decision 4: Filter Option Values

**Decision**: Use string literals: `last_one`, `hit_card`, `both`. Default = no filter parameter (all cards shown).

**Rationale**:
- `last_one`: `lastOnePrizeName` is a non-empty string
- `hit_card`: `atariCards` is a non-empty array
- `both`: both conditions true simultaneously
- No filter = omit the param entirely (clean URLs)

---

## Decision 5: URL Parameter Strategy

**Decision**: Add `sort` and `filter` as new searchParams alongside `area` and `page`. When sort/filter changes, reset page to 1.

**Rationale**: Matches existing `area` tab pattern. URLs become shareable/bookmarkable automatically. The existing `pageUrl()` helper in `page.tsx` must be extended to preserve sort and filter params.

**URL examples**:
- `/oripa?sort=price_asc`
- `/oripa?area=akihabara&sort=stock_asc&filter=hit_card`
- `/oripa?sort=price_desc&filter=both&page=2`

---

## Decision 6: Sort/Filter UI Component Placement

**Decision**: Add a toolbar row between the area tabs and the cards grid. Render sort buttons (horizontal button group) and filter buttons (horizontal button group) in that row.

**Rationale**: The area tabs occupy the top row. A second toolbar row is visually clean and follows the same pattern (flex row of buttons, active state via CSS class). No dropdown needed for 5 sort options + 3 filter options.

**Styling**: Reuse `.tab` / `.tabActive` CSS class pattern from `oripa.module.css`. Add new CSS classes for the toolbar layout.

---

## Decision 7: Sort Applied After Dedup, Before Cap

**Decision**: The processing order in `getTodayOnSalePosts` currently is: `sortNewestFirst → dedup → cap`. For non-default sorts, the sort step moves to **after dedup and after cap** — applied in `page.tsx` just before pagination slicing.

**Rationale**: `getTodayOnSalePosts` always returns the 60 newest-deduplicated posts. Sorting by price/stock is a presentation concern, not a data-fetching concern. This keeps the data layer clean and avoids changing the function signature.

**Alternative**: Pass sort param into `getTodayOnSalePosts` — Rejected: over-coupling UI concerns into the data layer.

---

## Decision 8: Filter Applied After Sort, Before Pagination

**Decision**: Filter is applied to the sorted array, and then pagination is calculated from the filtered array length.

**Rationale**: Pagination must reflect the actual number of items the user can see after filtering. If filter is applied after pagination, page counts would be wrong.

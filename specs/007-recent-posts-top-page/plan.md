# Implementation Plan: Recent On-Sale Posts on Top Page

**Branch**: `007-recent-posts-top-page` | **Date**: 2026-04-14 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/007-recent-posts-top-page/spec.md`

## Summary

The top page currently queries only today's JST date, so it shows nothing on days when no tweets have been analyzed. This feature expands the query to cover the last 14 days, showing the most recent known on-sale post per store. No DynamoDB schema or CDK changes are required; the existing GSI1 is queried once per (area, date) pair via `Promise.all`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, `force-dynamic`), `@aws-sdk/lib-dynamodb`, `@oripa-now/db`, `@oripa-now/types`  
**Storage**: DynamoDB — `oripa-posts` table, GSI1 (`areaStatusDate` → `createdAt`)  
**Testing**: Vitest 3.x (`pnpm --filter @oripa-now/web test`)  
**Target Platform**: AWS Lambda (web) + local Next.js dev server  
**Project Type**: Web application (Next.js Server Components)  
**Performance Goals**: Page load time comparable to current; 28 parallel DynamoDB queries expected <300 ms total  
**Constraints**: No DynamoDB schema changes; no CDK deploy  
**Scale/Scope**: 2 areas × 14 days = 28 parallel queries per page load

## Constitution Check

The constitution.md is a placeholder template (not yet populated for this project). No gates to enforce. Proceed.

## Project Structure

### Documentation (this feature)

```text
specs/007-recent-posts-top-page/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
├── quickstart.md    ← Phase 1 output
└── tasks.md         ← Phase 2 output (/speckit.tasks)
```

### Source Code (files changed)

```text
packages/types/src/index.ts          # Add saleAt to OripaPostSummary
packages/db/queries/oripa-posts.ts   # Add getRecentDatesJST + queryRecentOnSalePostsByArea
apps/web/lib/posts.ts                # Use new query; include saleAt in mapToSummary
apps/web/app/page.tsx                # Add Sale Date column; update subtitle
apps/web/lib/__tests__/posts.test.ts # Update T-09 + add T-11 for saleAt
```

## Implementation Steps

### Step 1 — `packages/types/src/index.ts`

Add `saleAt: string` to `OripaPostSummary`:

```ts
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  saleAt: string;      // ← add this
  price?: number;
  stockCount?: number;
}
```

### Step 2 — `packages/db/queries/oripa-posts.ts`

Add two new exports after the existing `getTodayJST`:

```ts
/**
 * Returns the last `days` dates in JST as "YYYY-MM-DD" strings, newest first.
 */
export function getRecentDatesJST(days = 14): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(d)
      .replace(/\//g, "-");
  });
}

/**
 * Query on-sale posts across the last `days` days for a single area.
 * All date queries run in parallel via Promise.all.
 */
export async function queryRecentOnSalePostsByArea(
  client: DynamoDBDocumentClient,
  tableName: string,
  area: string,
  days = 14,
): Promise<OripaPostItem[]> {
  const dates = getRecentDatesJST(days);
  const results = await Promise.all(
    dates.map((date) => queryOnSalePostsByDate(client, tableName, area, date)),
  );
  return results.flat();
}
```

### Step 3 — `apps/web/lib/posts.ts`

- Replace `getTodayJST` + `queryOnSalePostsByDate` imports with `queryRecentOnSalePostsByArea`
- Update `mapToSummary` to include `saleAt`
- Update `getTodayOnSalePosts` to call `queryRecentOnSalePostsByArea`

Key diff in `mapToSummary`:
```ts
// add saleAt: p.saleAt after createdAt
```

Key diff in `getTodayOnSalePosts`:
```ts
// Before
const dateJST = getTodayJST();
const results = await Promise.all(
  AREAS.map((area) => queryOnSalePostsByDate(client, TABLE_NAME, area, dateJST, MAX_RESULTS)),
);

// After
const results = await Promise.all(
  AREAS.map((area) => queryRecentOnSalePostsByArea(client, TABLE_NAME, area)),
);
```

Note: `MAX_RESULTS` cap is still applied downstream via `capResults`.

### Step 4 — `apps/web/app/page.tsx`

- Update subtitle: `"Most recent available info per store — sorted by newest sale date"`
- Rename `"Updated At"` column header to `"Analyzed At"` (reflects `createdAt` semantics)
- Add `"Sale Date"` column (before Price) showing `s.saleAt` formatted in JST

```tsx
<th style={{ padding: '8px' }}>Sale Date</th>
// ...
<td style={{ padding: '8px' }}>{s.saleAt}</td>
```

### Step 5 — `apps/web/lib/__tests__/posts.test.ts`

Update existing T-09 to assert `saleAt` is mapped:

```ts
expect(summary.saleAt).toBe("2026-04-13");
```

Add T-11 — pipeline with multi-store, multi-day data produces correct deduplication (optional integration smoke test using `makePost` fixture).

## Complexity Tracking

No constitution violations. No complexity justification needed.

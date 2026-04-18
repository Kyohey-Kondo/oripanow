# Implementation Plan: Top Page Pagination

**Branch**: `011-top-page-pagination` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)

## Summary

Add URL-driven pagination to the top page table: 20 items per page, max 3 pages (60 items total). Implemented by extending the existing `MAX_RESULTS` cap and slicing the already-fetched result array in the Server Component.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, `force-dynamic`, `searchParams`)  
**Storage**: No DynamoDB changes — existing `getTodayOnSalePosts` extended to 60 items  
**Testing**: Playwright screenshot verification  
**Target Platform**: Lambda + CloudFront (existing)  
**Project Type**: Web application  
**Performance Goals**: No regression vs current  
**Constraints**: Server-side only, no client-side JS for pagination  
**Scale/Scope**: 2 files changed, ~30 lines added

## Constitution Check

Constitution is a placeholder template — no project-specific gates. No violations.

## Project Structure

```text
specs/011-top-page-pagination/
├── plan.md       ← this file
├── research.md   ✓
├── data-model.md ✓
├── quickstart.md ✓
└── tasks.md      (created by /speckit.tasks)
```

```text
apps/web/lib/posts.ts     ← MAX_RESULTS: 50 → 60
apps/web/app/page.tsx     ← page param, slice, pagination controls
```

## Implementation Steps

### Step 1 — `apps/web/lib/posts.ts`

Change `MAX_RESULTS` from `50` to `60`.

### Step 2 — `apps/web/app/page.tsx`

1. Read `page` from `searchParams` alongside existing `area`
2. Compute pagination values:
   ```ts
   const PAGE_SIZE = 20;
   const MAX_PAGES = 3;
   const pageIndex = Math.min(Math.max(parseInt(page ?? '1') || 1, 1), MAX_PAGES);
   const pageItems = summaries.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE);
   const totalPages = Math.min(Math.ceil(summaries.length / PAGE_SIZE), MAX_PAGES);
   ```
3. Render `pageItems` in the table (instead of `summaries`)
4. Keep oEmbed `top3` derived from full `summaries` (not `pageItems`)
5. Add pagination controls below the table:
   - 「前へ」: link to `?page=N-1` (+ area if set), hidden on page 1
   - 「次へ」: link to `?page=N+1` (+ area if set), hidden on last page
   - Current page indicator: `N / totalPages ページ`

### URL helper (inline)

```ts
function pageUrl(p: number, area?: string) {
  const params = new URLSearchParams();
  if (area) params.set('area', area);
  if (p > 1) params.set('page', String(p));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}
```

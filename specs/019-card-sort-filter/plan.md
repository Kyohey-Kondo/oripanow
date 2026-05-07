# Implementation Plan: Card Sort and Filter

**Branch**: `019-card-sort-filter` | **Date**: 2026-05-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/019-card-sort-filter/spec.md`

## Summary

Add sort (newest / price / stock count, both directions) and filter (last-one prize / hit card info / both) controls to the oripa card listing page. Sort and filter state is stored in URL query parameters so views are shareable. All logic is applied server-side on the existing 60-item data set, requiring no database changes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, Server Components), CSS Modules  
**Storage**: No changes — existing DynamoDB queries unchanged  
**Testing**: Playwright (UI verification per project rule)  
**Target Platform**: Web (desktop + mobile)  
**Project Type**: Web application (SSR)  
**Performance Goals**: Sort/filter renders within one server round-trip (<500ms)  
**Constraints**: No client-side state; must remain a Server Component; 60-item max data set  
**Scale/Scope**: Single page (`apps/web/app/oripa/page.tsx`) + shared lib (`apps/web/lib/posts.ts`)

## Constitution Check

Constitution file contains only placeholder content — no project-specific gates defined. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/019-card-sort-filter/
├── plan.md         ← this file
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
└── checklists/
    └── requirements.md
```

### Source Code (files to modify/create)

```text
apps/web/
├── lib/
│   └── posts.ts                          # add sortPosts(), filterPosts(), type exports
└── app/oripa/
    ├── page.tsx                          # parse sort/filter params, apply pipeline, update pageUrl()
    ├── oripa.module.css                  # add toolbar, sort/filter button styles
    └── components/
        └── SortFilterToolbar.tsx         # new: sort+filter UI component (Server Component)
```

No changes to: `packages/db/`, `packages/types/`, `infra/cdk/`, `apps/batch/`

## Implementation Steps

### Step 1 — Add sort/filter pure functions to `apps/web/lib/posts.ts`

Add the following exports:

```typescript
export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';
export type FilterOption = 'last_one' | 'hit_card' | 'both';

export const VALID_SORTS: SortOption[] = ['newest','price_asc','price_desc','stock_asc','stock_desc'];
export const VALID_FILTERS: FilterOption[] = ['last_one','hit_card','both'];

export function sortPosts(posts: OripaPostSummary[], sort: SortOption): OripaPostSummary[]
export function filterPosts(posts: OripaPostSummary[], filter: FilterOption | undefined): OripaPostSummary[]
```

**sortPosts logic**:
- `newest`: already sorted by `getTodayOnSalePosts` — return as-is
- `price_asc/desc`: sort by `price`, undefined values go to end
- `stock_asc/desc`: sort by `stockCount`, undefined values go to end

**filterPosts logic**:
- `undefined`: return all
- `last_one`: keep where `lastOnePrizeName` is a non-empty string
- `hit_card`: keep where `atariCards` is a non-empty array
- `both`: both conditions true

### Step 2 — Update `apps/web/app/oripa/page.tsx`

1. Extend searchParams type: `{ area?: string; page?: string; sort?: string; filter?: string }`
2. Parse and validate `sort` and `filter` params (fallback to defaults on invalid values)
3. Update `pageUrl()` to preserve `sort` and `filter` params (reset `page` to 1 when omitted)
4. Add `sortPosts()` and `filterPosts()` calls between `getTodayOnSalePosts()` and pagination slicing
5. Pass `sort` and `filter` values into `<SortFilterToolbar>` for active state rendering
6. Render `<SortFilterToolbar>` between area tabs and cards grid
7. Show empty state message when `pageItems.length === 0` after filtering

**Updated processing pipeline in page**:
```typescript
const summaries = await getTodayOnSalePosts(area);         // existing
const sorted = sortPosts(summaries, resolvedSort);          // new
const filtered = filterPosts(sorted, resolvedFilter);       // new
const pageIndex = ...;                                      // existing (but uses filtered.length)
const totalPages = Math.min(Math.ceil(filtered.length / PAGE_SIZE), MAX_PAGES);
const pageItems = filtered.slice(...);                      // existing slice logic
```

### Step 3 — Create `apps/web/app/oripa/components/SortFilterToolbar.tsx`

Server Component (no `"use client"`). Renders two rows of link buttons:

**Row 1 — Sort buttons** (5 buttons):
| Label | sort param |
|-------|------------|
| 新着順 | newest (default) |
| 価格 安→高 | price_asc |
| 価格 高→安 | price_desc |
| 在庫 少→多 | stock_asc |
| 在庫 多→少 | stock_desc |

**Row 2 — Filter buttons** (4 buttons):
| Label | filter param |
|-------|-------------|
| すべて | (absent) |
| ラストワンあり | last_one |
| あたり情報あり | hit_card |
| 両方あり | both |

Each button is an `<a>` tag with an href built from current params (updating only the relevant param, always resetting `page`). Active state: `tabActive` CSS class when current sort/filter matches.

Props:
```typescript
type Props = {
  currentSort: SortOption;
  currentFilter: FilterOption | undefined;
  area: string | undefined;
};
```

### Step 4 — Add CSS to `apps/web/app/oripa/oripa.module.css`

New classes:
- `.toolbar`: flex row, gap 6px, flex-wrap wrap, margin-bottom 12px
- `.toolbarSection`: label + button group within toolbar
- `.toolbarLabel`: small muted label ("並び順", "絞り込み")

Reuse existing `.tab` and `.tabActive` for the buttons (they already have the right styling).

### Step 5 — Playwright verification

Per project rule ("Always verify UI changes with Playwright before deploying"):

1. Default view — toolbar visible, 新着順 active
2. `?sort=price_asc` — 価格 安→高 button highlighted, cards in price order
3. `?filter=hit_card` — あたり情報あり highlighted, only matching cards shown
4. `?sort=price_asc&filter=both` — both buttons highlighted, combined result
5. Filter that produces 0 cards — empty state message visible
6. Mobile viewport (375px) — toolbar wraps correctly

## Complexity Tracking

No constitution violations. No new complexity introduced.

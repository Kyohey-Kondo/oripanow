# Quickstart: Card Sort and Filter

**Feature**: 019-card-sort-filter

## Running the Dev Server

```bash
pnpm --filter @oripa-now/web dev
```

Then open `http://localhost:3000/oripa`.

## Testing Sort

Navigate to `/oripa?sort=price_asc` and confirm cards are ordered lowest price first.
Navigate to `/oripa?sort=stock_desc` and confirm cards are ordered highest stock count first.

## Testing Filter

Navigate to `/oripa?filter=last_one` and confirm only cards with a last-one prize name are shown.
Navigate to `/oripa?filter=hit_card` and confirm only cards with atari card info are shown.
Navigate to `/oripa?filter=both` and confirm only cards with both last-one and atari info are shown.

## Testing Combined

Navigate to `/oripa?sort=price_asc&filter=hit_card` and confirm results are filtered to hit-card cards and sorted lowest price first.

## Testing Pagination Reset

Activate a filter that leaves more than 20 results. Navigate to page 2. Change sort. Confirm page resets to 1.

## Typecheck

```bash
pnpm typecheck
```

## Playwright Verification

Before marking done, take a Playwright screenshot of:
1. The default view (no params) — sort/filter toolbar visible
2. An active sort state
3. An active filter state
4. An empty state (filter that returns 0 cards for current data)

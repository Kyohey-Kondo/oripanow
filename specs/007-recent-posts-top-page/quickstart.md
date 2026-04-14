# Quickstart: Recent On-Sale Posts on Top Page

## Prerequisites

- Node.js 22 LTS, pnpm 9.x
- AWS credentials configured (for DynamoDB access in dev/staging)

## Development

```bash
# Install dependencies (from repo root)
pnpm install

# Start the web dev server
pnpm --filter @oripa-now/web dev
```

Open http://localhost:3000 — the top page now shows results from the last 14 days instead of today only.

## Running Tests

```bash
# Unit tests for apps/web
pnpm --filter @oripa-now/web test

# Typecheck all packages
pnpm typecheck

# Lint all packages
pnpm lint
```

## Verifying the Change

1. **With live DynamoDB**: Open the top page. If today has no data but previous days do, stores will appear.
2. **With seed data**: Run `pnpm --filter @oripa-now/db seed` — seeds include yesterday's posts. After seeding, the top page should show the yesterday records even though today's date has no data.
3. **Unit test coverage**: `mapToSummary` test (T-09) must assert `saleAt` is present in the summary.

## Key Files Changed

| File | Change |
|------|--------|
| `packages/types/src/index.ts` | Add `saleAt: string` to `OripaPostSummary` |
| `packages/db/queries/oripa-posts.ts` | Add `getRecentDatesJST()` and `queryRecentOnSalePostsByArea()` |
| `apps/web/lib/posts.ts` | Use `queryRecentOnSalePostsByArea`; include `saleAt` in `mapToSummary` |
| `apps/web/app/page.tsx` | Add "Sale Date" column; update subtitle |
| `apps/web/lib/__tests__/posts.test.ts` | Update T-09 to assert `saleAt` field |

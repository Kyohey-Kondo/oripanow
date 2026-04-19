# Quickstart: Shop Detail Page Google Map

## What changes

| File | Change |
|------|--------|
| `apps/web/lib/posts.ts` | Add `area` field to `getShopPosts` return value |
| `apps/web/app/oripa/shops/[storeId]/page.tsx` | Add Google Map iframe above the table |

## Local dev

```bash
pnpm --filter @oripa-now/web dev
```

Open `http://localhost:3000/oripa/shops/<storeId>` — a map should appear above the post table.

## Verify

1. Visit any shop detail page
2. Confirm a Google Map is displayed above the oripa post table
3. Confirm the map is searchable using the store name + area (check the embed URL in browser DevTools)
4. Confirm the post table is visible even before the map finishes loading

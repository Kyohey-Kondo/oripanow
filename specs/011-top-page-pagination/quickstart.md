# Quickstart: Top Page Pagination

## Files to modify

| File | Change |
|------|--------|
| `apps/web/lib/posts.ts` | `MAX_RESULTS` 50 → 60 |
| `apps/web/app/page.tsx` | Read `page` from `searchParams`, slice `summaries`, render pagination controls |

## Local dev

```bash
pnpm --filter @oripa-now/web dev
# http://localhost:3000        → page 1 (20 items)
# http://localhost:3000?page=2 → page 2 (items 21-40)
# http://localhost:3000?page=3 → page 3 (items 41-60)
# http://localhost:3000?area=akihabara&page=2 → filtered + paged
```

## Verification checklist

1. Page 1: 20 rows max, 「前へ」 absent, 「次へ」 present (if >20 total)
2. Page 2: 20 rows max, both controls present
3. Page 3: ≤20 rows, 「次へ」 absent
4. `?page=0`, `?page=4`, `?page=abc` → behaves as page 1
5. `?area=akihabara&page=2` → only akihabara items, page 2 offset
6. Clicking area filter resets to page 1
7. oEmbed sidebar unchanged across pages

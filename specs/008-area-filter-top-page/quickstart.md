# Quickstart: Area Filter on Top Page

## Development

```bash
pnpm --filter @oripa-now/web dev
```

## Verifying the Change

1. Open http://localhost:3000 — all areas shown, "すべて" highlighted
2. Open http://localhost:3000/?area=akihabara — only akihabara posts, "秋葉原" highlighted
3. Click another area button — URL updates, list updates
4. Click "すべて" — returns to unfiltered view
5. Open http://localhost:3000/?area=invalid — empty list or all posts (fallback)

## Key Files Changed

| File | Change |
|------|--------|
| `apps/web/lib/posts.ts` | Add optional `area?` param to `getTodayOnSalePosts` |
| `apps/web/app/page.tsx` | Read `searchParams.area`; render area filter buttons |

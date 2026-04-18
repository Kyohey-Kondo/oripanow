# Quickstart: Shop Detail Page

## Files to create / modify

| Action | File |
|--------|------|
| Modify | `packages/db/queries/oripa-posts.ts` — add `queryRecentPostsByStore` |
| Modify | `apps/web/lib/posts.ts` — add `getShopPosts(storeId)` orchestrator |
| Create | `apps/web/app/shops/[storeId]/page.tsx` — shop detail page |
| Modify | `apps/web/app/page.tsx` — wrap store name in `<Link href="/shops/[storeId]">` |

## Local dev

```bash
pnpm --filter @oripa-now/web dev
# open http://localhost:3000
# click any store name → should navigate to /shops/<storeId>
```

## Verification

1. Top page: every store name is a clickable link
2. `/shops/<storeId>`: shows only posts from that store
3. `/shops/<storeId>`: heading shows store name
4. `/shops/<storeId>`: tweet previews on right (desktop) / top (mobile)
5. `/shops/<storeId>`: "← トップへ戻る" link returns to `/`
6. `/shops/nonexistent`: shows empty state, no crash

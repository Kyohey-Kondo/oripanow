# Implementation Plan: Shop Detail Page

**Branch**: `010-shop-detail-page` | **Date**: 2026-04-18 | **Spec**: [spec.md](spec.md)

## Summary

Add a shop detail page (`/shops/[storeId]`) that shows only posts from a single shop, with the same two-column layout as the top page. Shop names on the top page become clickable links to this page.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, `force-dynamic`), `@aws-sdk/lib-dynamodb`, `@oripa-now/db`, `@oripa-now/types`  
**Storage**: DynamoDB — `oripa-posts` table via GSI2 (`storeId → createdAt`), `stores` table via GetItem  
**Testing**: Playwright screenshot (visual verification)  
**Target Platform**: Lambda (via serverless-http) + CloudFront  
**Project Type**: Web application  
**Performance Goals**: Same as top page  
**Constraints**: `force-dynamic` (no ISR), same 14-day lookback window  
**Scale/Scope**: One new route, two file edits, one new query function

## Constitution Check

Constitution is a placeholder template — no project-specific gates defined. Proceeding without gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/010-shop-detail-page/
├── plan.md              ← this file
├── research.md          ✓
├── data-model.md        ✓
├── quickstart.md        ✓
└── tasks.md             (created by /speckit.tasks)
```

### Source Code

```text
packages/db/queries/
└── oripa-posts.ts        ← add queryRecentPostsByStore()

apps/web/
├── lib/posts.ts          ← add getShopPosts(storeId)
└── app/
    ├── page.tsx           ← wrap storeName in <a href="/shops/[storeId]">
    └── shops/
        └── [storeId]/
            └── page.tsx   ← NEW: shop detail page
```

## Implementation Steps

### Step 1 — Add `queryRecentPostsByStore` to `packages/db/queries/oripa-posts.ts`

Query GSI2 (`storeId → createdAt`) for a single store, last 14 days, newest first.

```typescript
export async function queryRecentPostsByStore(
  client: DynamoDBDocumentClient,
  tableName: string,
  storeId: string,
  days = 14,
): Promise<OripaPostItem[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffISO = cutoff.toISOString();

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: GSI.oripaPostsByStore,   // 'GSI2'
      KeyConditionExpression: 'storeId = :storeId AND createdAt >= :cutoff',
      ExpressionAttributeValues: { ':storeId': storeId, ':cutoff': cutoffISO },
      ScanIndexForward: false,
      Limit: 100,
    }),
  );
  return (result.Items ?? []) as OripaPostItem[];
}
```

### Step 2 — Add `getShopPosts` to `apps/web/lib/posts.ts`

Orchestrator: query GSI2, fetch store GetItem for `twitterUsername`, map to `OripaPostSummary[]`.

```typescript
export async function getShopPosts(storeId: string): Promise<{
  summaries: OripaPostSummary[];
  storeName: string;
  twitterUsername: string;
}> { ... }
```

Uses:
- `queryRecentPostsByStore` from `@oripa-now/db/queries/oripa-posts`
- `GetCommand` on `TABLE_NAMES.stores` for `twitterUsername` + `name`
- Same `sortNewestFirst` + `deduplicateByPriceAndStock` + `capResults` + `mapToSummary` pipeline

### Step 3 — Create `apps/web/app/shops/[storeId]/page.tsx`

- `export const dynamic = 'force-dynamic'`
- Params: `{ storeId: string }`
- Calls `getShopPosts(storeId)`
- Same table + oEmbed sidebar layout as `page.tsx`
- Heading: store name (or "ショップ詳細" if not found)
- Empty state: `<p>この店舗の直近14日間の情報はありません。</p>`
- Back link: `<a href="/">← トップへ戻る</a>`
- Imports `styles` from `../../page.module.css` (reuse existing CSS)

### Step 4 — Update `apps/web/app/page.tsx`

Wrap the store name cell with an anchor tag:

```tsx
<td style={{ padding: '8px' }}>
  <a href={`/shops/${s.storeId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
    {s.storeName.length > 20 ? s.storeName.slice(0, 20) + '…' : s.storeName}
  </a>
</td>
```

## Verification

```bash
# Start dev server
pnpm --filter @oripa-now/web dev

# Playwright screenshot — top page shows store name links
# Playwright screenshot — /shops/<storeId> shows only that store's posts
# Playwright screenshot — mobile viewport works correctly
```

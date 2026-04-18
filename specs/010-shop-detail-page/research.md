# Research: Shop Detail Page

## Decision 1: URL structure for shop detail page

**Decision**: `/shops/[storeId]` (e.g., `/shops/01KP76K78AB6BHFEWHXRA1M8YQ`)
**Rationale**: `storeId` is a ULID — unique, URL-safe, and already used as the DynamoDB PK. Store names may contain Japanese characters that require encoding.
**Alternatives considered**: `/shops/[twitterUsername]` — readable but requires an extra lookup from username to storeId; `/shops/[storeName]` — not URL-safe.

## Decision 2: DynamoDB query for shop posts

**Decision**: Use GSI2 on `oripa-posts` (`storeId → createdAt`) — already defined in `batch-stack.ts` and `schema/index.ts`.
**Rationale**: GSI2 (`IndexName: 'GSI2'`) exists and is indexed by `storeId` with `createdAt` as SK. A simple `KeyConditionExpression: 'storeId = :storeId'` query returns all posts for a shop, newest first.
**Alternatives considered**: Scan with filter — inefficient at scale.

**New function needed** in `packages/db/queries/oripa-posts.ts`:
```
queryRecentPostsByStore(client, tableName, storeId, days = 14)
```
Uses GSI2 with `ScanIndexForward: false`, filters to last 14 days via `createdAt` sort key range.

## Decision 3: Store metadata on detail page

**Decision**: Fetch the store record from `dev-stores` by `storeId` (GetItem) to display the store name in the heading and resolve `twitterUsername` for oEmbed.
**Rationale**: `storeName` is denormalized into `OripaPostItem` and available directly. `twitterUsername` requires a store lookup (same as top page BatchGet pattern). Given only one store is needed, use `GetItem` instead of `BatchGet`.
**Alternatives considered**: Extract from the first post's `storeName` — works for name but not `twitterUsername`.

## Decision 4: Routing — Next.js App Router dynamic segment

**Decision**: Create `apps/web/app/shops/[storeId]/page.tsx` as a Next.js dynamic route segment.
**Rationale**: Standard App Router pattern. `params.storeId` is available as a prop. `force-dynamic` is applied consistently with the top page.
**Alternatives considered**: None — this is the only App Router option.

## Decision 5: Reuse of top page layout components

**Decision**: Copy the two-column layout pattern from `apps/web/app/page.tsx` directly into the shop page. The `page.module.css` styles (`main`, `contentLayout`, `tableColumn`, `tweetSidebar`, `tweetList`) are already defined and can be imported.
**Rationale**: Zero new CSS needed — all responsive styles already exist in `page.module.css`.
**Alternatives considered**: Extract shared component — over-engineering for two pages.

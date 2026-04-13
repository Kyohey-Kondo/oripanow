# Data Model: Twitter Data Fetch

**Branch**: `005-twitter-fetch` | **Date**: 2026-04-13

## Existing Entities (No Schema Changes Required)

The data model for this feature is already defined in `packages/db/schema/index.ts`. No new DynamoDB tables or GSIs are needed.

---

## Entity: StoreItem (modified — add `lastFetchedTweetId`)

**Table**: `${DEPLOY_ENV}-stores`
**File**: `packages/db/schema/index.ts`

| Field | Type | Notes |
|-------|------|-------|
| `storeId` | `string` (ULID) | PK |
| `name` | `string` | Store display name |
| `twitterUsername` | `string` | Twitter handle without `@` (e.g., `"storeName123"`) |
| `area` | `"tokyo" \| "omiya"` | Geographic area |
| `isActive` | `boolean` | Only active stores are fetched |
| `createdAt` | `string` ISO 8601 | |
| `updatedAt` | `string` ISO 8601 | Updated on each batch run that fetches tweets |
| **`lastFetchedTweetId`** | `string \| undefined` | **NEW** — Highest tweet ID seen on the last successful fetch run for this store. Used as `since_id` for the Twitter API to avoid re-fetching known tweets. |

**Change**: Add optional `lastFetchedTweetId?: string` to `StoreItem` type. No DynamoDB schema migration needed (DynamoDB is schemaless; the field is just absent for stores that have never been fetched).

---

## Entity: TweetItem (unchanged)

**Table**: `${DEPLOY_ENV}-tweets`
**File**: `packages/db/schema/index.ts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` (ULID) | PK — internal ID generated at fetch time |
| `tweetId` | `string` | Twitter's external tweet ID (used for deduplication) |
| `storeId` | `string` (ULID) | FK to stores table |
| `content` | `string` | Full tweet text |
| `tweetedAt` | `string` ISO 8601 | When the tweet was originally posted on Twitter |
| `isProcessed` | `boolean` | `false` on creation; set to `true` after AI analysis |
| `fetchedAt` | `string` ISO 8601 | When this batch run saved the record |
| `processStatus` | `"UNPROCESSED" \| undefined` | Sparse GSI2 attribute — present only when `isProcessed === false` |

**GSI1** (`tweetsByStore`): `storeId` → `tweetedAt` — query all tweets for a store in chronological order
**GSI2** (`unprocessedTweets`): `processStatus` → `fetchedAt` — scan unprocessed queue (sparse index, only includes unprocessed rows)

---

## State Transition: TweetItem.processStatus

```
Fetch Run
    │
    ▼
TweetItem created
  isProcessed = false
  processStatus = "UNPROCESSED"   ← appears in GSI2 (batch queue)
    │
    ▼ (AI analysis — future feature)
  isProcessed = true
  processStatus = undefined        ← removed from GSI2 (sparse index)
```

---

## Access Patterns

| Pattern | Operation | Key |
|---------|-----------|-----|
| Get all active stores | `Scan` stores table with `FilterExpression: isActive = true` | — |
| Get store by storeId | `GetItem` | `storeId` |
| Check if tweetId already exists | `Query` GSI1 on tweets + client-side filter, or conditional `PutItem` | `storeId` + `tweetedAt` range |
| Write new tweet record | `PutItem` | `id` (ULID) |
| Update store's lastFetchedTweetId | `UpdateItem` | `storeId` |
| Queue scan (future AI batch) | `Query` GSI2 on tweets | `processStatus = "UNPROCESSED"` |

> **Note on deduplication**: The Twitter API `since_id` parameter (set to `lastFetchedTweetId`) is the primary deduplication mechanism. A conditional `PutItem` with `attribute_not_exists(tweetId)` on a GSI is not directly supported; deduplication is enforced at the application layer by only writing tweets not already present.

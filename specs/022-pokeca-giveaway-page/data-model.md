# Data Model: Pokémon Card Giveaway Campaign Page

**Feature**: 022-pokeca-giveaway-page
**Date**: 2026-05-21

## Entities

### GiveawayTweetItem (`{env}-giveaway-tweets`)

Raw tweet pending AI analysis.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tweetId` | string (PK) | ✓ | Twitter's numeric tweet ID |
| `sourceType` | `"store"` \| `"search"` | ✓ | Whether fetched from a store account or broad search |
| `storeId` | string | — | ULID; set only when `sourceType="store"` |
| `content` | string | ✓ | Full tweet text |
| `twitterUsername` | string | ✓ | Twitter handle (without @) |
| `tweetedAt` | string (ISO 8601) | ✓ | When the tweet was posted |
| `fetchedAt` | string (ISO 8601) | ✓ | When we fetched it |
| `isProcessed` | boolean | ✓ | `false` until Claude analysis completes |
| `processStatus` | `"UNPROCESSED"` | — | Sparse GSI2 key; present only when `isProcessed=false` |

**Indexes**:
- GSI2: `processStatus` (PK) → `fetchedAt` (SK) — unprocessed analysis queue

**State transition**: `isProcessed=false, processStatus="UNPROCESSED"` → `isProcessed=true` (processStatus attribute removed)

---

### GiveawayPostItem (`{env}-giveaway-posts`)

Analyzed giveaway campaign.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `postId` | string (PK) | ✓ | Same as `tweetId` (one post per tweet for giveaways) |
| `tweetId` | string | ✓ | Twitter tweet ID |
| `sourceType` | `"store"` \| `"search"` | ✓ | |
| `storeId` | string | — | Set when `sourceType="store"` |
| `storeName` | string | — | Denormalized; set when `sourceType="store"` |
| `twitterUsername` | string | ✓ | For tweet URL construction |
| `status` | `"active"` \| `"ended"` \| `"upcoming"` | ✓ | Giveaway lifecycle state |
| `prizes` | `GiveawayPrize[]` | ✓ | One or more prizes |
| `conditions` | string | — | Entry conditions (e.g. "フォロー＋RT") |
| `deadline` | string (YYYY-MM-DD) | — | Application deadline; absent if not parseable |
| `rawText` | string | ✓ | Original tweet text |
| `createdAt` | string (ISO 8601) | ✓ | When this record was written |
| `updatedAt` | string (ISO 8601) | ✓ | |
| `statusDeadline` | string | ✓ | GSI1 PK: `"{status}#{deadline}"` or `"active#9999-12-31"` |

**Indexes**:
- GSI1: `statusDeadline` (PK) → `createdAt` (SK) — query active giveaways by deadline date

---

### GiveawayPrize (embedded in GiveawayPostItem)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"box"` \| `"single"` \| `"other"` | ✓ | Product category |
| `name` | string | ✓ | Product name (e.g. "バトルパートナーズ BOX", "ピカチュウex SAR") |
| `count` | number | — | Number of winners (if stated) |

---

### GiveawayPostSummary (frontend view type)

| Field | Type | Description |
|-------|------|-------------|
| `postId` | string | |
| `tweetId` | string | |
| `twitterUsername` | string | For tweet URL |
| `sourceType` | `"store"` \| `"search"` | |
| `storeId` | string? | |
| `storeName` | string? | |
| `prizes` | `GiveawayPrize[]` | |
| `conditions` | string? | |
| `deadline` | string? | YYYY-MM-DD |
| `daysRemaining` | number? | Computed from deadline − today |
| `createdAt` | string | |
| `status` | `"active"` \| `"ended"` \| `"upcoming"` | |

---

## State Transitions

### GiveawayTweetItem

```
FETCHED (isProcessed=false, processStatus="UNPROCESSED")
  → ANALYZED (isProcessed=true, processStatus removed)
```

### GiveawayPostItem.status

```
not_giveaway → DISCARDED (no record written)
active / upcoming / ended → WRITTEN (one record)
```

The frontend only queries `statusDeadline` keys starting with `"active#"`, so `ended` and `upcoming` items are automatically hidden.

---

## Query Patterns

### Get active giveaways (frontend)

Fan-out over dates `today` through `today+60`, plus sentinel `"active#9999-12-31"`:

```
GSI1 query: statusDeadline = "active#2026-05-21"  (today)
GSI1 query: statusDeadline = "active#2026-05-22"  (+1 day)
...
GSI1 query: statusDeadline = "active#2026-07-20"  (+60 days)
GSI1 query: statusDeadline = "active#9999-12-31"  (no deadline)
→ Promise.all → flatten → sort by deadline ASC
```

### Get unprocessed tweets (batch)

```
GSI2 query: processStatus = "UNPROCESSED" ORDER BY fetchedAt ASC LIMIT 50
```

---

## Relationships

```
stores (existing)
  └─ storeId ──→ GiveawayTweetItem.storeId (optional)
                └─ GiveawayPostItem.storeId (optional)
                   GiveawayPostItem.storeName (denormalized)

GiveawayTweetItem.tweetId ──→ GiveawayPostItem.tweetId (1:1)
```

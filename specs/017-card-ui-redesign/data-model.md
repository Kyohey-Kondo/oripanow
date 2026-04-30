# Data Model: Oripa Card UI Redesign

**Feature**: 017-card-ui-redesign  
**Date**: 2026-04-29

> This feature is a **presentation-only change**. No DynamoDB schema changes, no new tables, no new Lambda functions. All data flows through the existing `OripaPostSummary` type.

---

## Existing Type: `OripaPostSummary` (unchanged)

Source: `packages/types/src/index.ts`

| Field | Type | Required | Notes |
|---|---|---|---|
| `postId` | `string` | yes | Unique post ID (ULID) |
| `storeId` | `string` | yes | Store ID |
| `storeName` | `string` | yes | Display name of the store |
| `twitterUsername` | `string` | yes | Twitter handle for oEmbed URL construction |
| `createdAt` | `string` | yes | ISO timestamp of post creation |
| `saleAt` | `string` | yes | Sale date in JST (YYYY-MM-DD) |
| `tweetId` | `string` | yes | Snowflake tweet ID (used for time derivation and URL) |
| `price` | `number` | no | Price in JPY |
| `stockCount` | `number` | no | Number of stock units |
| `lastOnePrizeName` | `string` | no | Name of the last-one prize |
| `atariCards` | `string[]` | no | List of hit card names |

---

## Derived Values (UI-only, not persisted)

### PriceTier

Computed from `price` at render time. Not stored.

| Tier | Condition | CSS variable color | Top bar color |
|---|---|---|---|
| `high` | `price >= 10000` | `--accent` = `#f5c842` | Gold |
| `mid` | `price >= 5000 && price < 10000` | `--accent3` = `#4fc3f7` | Blue |
| `low` | `price < 5000` | `#a3e635` | Green |
| `unknown` | `price === undefined` | `--accent` = `#f5c842` | Gold (default) |

### PostTimestamp

Derived from `tweetId` using the Twitter snowflake formula already in the codebase:
```
timestamp = Number((BigInt(tweetId) >> 22n) + 1288834974657n)
```
Formatted as `M/D HH:mm` in JST.

---

## No New Entities

This feature introduces no new data entities. All UI state (active area tab, current page) is encoded in URL search parameters (`?area=`, `?page=`) — no client-side state required.

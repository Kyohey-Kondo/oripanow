# Implementation Plan: Pokémon Card Giveaway Campaign Page

**Branch**: `022-pokeca-giveaway-page` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/022-pokeca-giveaway-page/spec.md`

## Summary

Build a new page (`/giveaway`) that aggregates Pokémon card giveaway campaigns from Twitter, displays them with prize content, entry conditions, and deadline. A new parallel batch pipeline (fetch → Claude AI analysis → DynamoDB) runs daily alongside the existing oripa pipeline.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS / Lambda Node.js 22.x + Next.js 15 (App Router, `force-dynamic`)
**Primary Dependencies**: `@aws-sdk/lib-dynamodb`, `@aws-sdk/client-bedrock-runtime`, `twitter-api-v2`, `@oripa-now/db`, `@oripa-now/types`, AWS CDK v2
**Storage**: DynamoDB — two new tables: `{env}-giveaway-tweets` (raw), `{env}-giveaway-posts` (analyzed)
**Testing**: `pnpm typecheck` (TypeScript strict), Playwright for UI verification
**Target Platform**: AWS Lambda + CloudFront + Next.js (same as existing)
**Project Type**: Monorepo web service + batch pipeline
**Performance Goals**: Page load same as existing oripa page; client-side sort/filter < 1s
**Constraints**: Twitter API v2 rate limits; Claude Bedrock daily batch (once/day); `attribute_not_exists` idempotency
**Scale/Scope**: ~50–200 giveaway tweets/day; ~20–50 active campaigns shown

## Constitution Check

*Constitution is a template (not ratified). No gates to enforce.*

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/022-pokeca-giveaway-page/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/batch/src/
├── fetch-giveaway.ts          # NEW — fetch tweets (store accounts + keyword search)
├── parse-giveaway.ts          # NEW — Claude Bedrock tool schema + analyzeGiveawayTweet()
├── save-giveaway.ts           # NEW — DynamoDB writes, idempotency, mark processed
└── analyze-giveaway.ts        # NEW — Lambda handler (queue consumer + CloudFront invalidate)

apps/web/
├── app/giveaway/
│   ├── page.tsx               # NEW — Server Component, force-dynamic
│   ├── giveaway.module.css    # NEW — CSS Module
│   └── components/
│       ├── GiveawayCard.tsx               # NEW
│       └── GiveawaySortFilterToolbar.tsx  # NEW
└── lib/
    └── giveaways.ts           # NEW — getActiveGiveaways(), sort/filter/map helpers

packages/db/
├── schema/index.ts            # MODIFY — add GiveawayTweetItem, GiveawayPostItem, TABLE_NAMES, GSI
└── queries/
    └── giveaway-posts.ts      # NEW — queryActiveGiveawaysForDateRange()

packages/types/src/index.ts    # MODIFY — add GiveawayPostSummary, GiveawayPrize

infra/cdk/lib/
├── batch-stack.ts             # MODIFY — DynamoDB tables, Lambdas, EventBridge
└── web-stack.ts               # MODIFY — IAM grants + env var for web Lambda

apps/web/app/components/Footer.tsx   # MODIFY — add /giveaway nav link
```

**Structure Decision**: Monorepo option — parallel pipeline to existing oripa batch, same Next.js App Router pattern.

## Architecture: Data Flow

```
Twitter（店舗アカウント + キーワード検索）
  ↓
[1] fetch-giveaway Lambda (daily 10:00 JST)
    Strategy A: from:{username} (プレゼント OR 懸賞) (ポケカ OR ポケモンカード) -is:retweet
    Strategy B: broad keyword search (ポケカ) (プレゼント OR 懸賞 OR 企画) (フォロー OR RT) -is:retweet lang:ja
    → {env}-giveaway-tweets (processStatus="UNPROCESSED" sparse GSI)
  ↓
[2] analyze-giveaway Lambda (daily 10:10 JST)
    Claude Bedrock tool: classify_giveaway_tweet
    Extracts: prizes[], conditions, deadline, status
    → {env}-giveaway-posts (statusDeadline GSI)
    → CloudFront invalidation /giveaway*
  ↓
Next.js /giveaway page
    queryActiveGiveawaysForDateRange() — GSI1 fan-out today→today+60 + sentinel
    Client: sort (deadline_asc | newest) + filter (all | box | single)
```

## DynamoDB Table Design

### `{env}-giveaway-tweets`
| Key | Attribute | Value |
|-----|-----------|-------|
| PK | `tweetId` | Twitter tweet ID |
| GSI2 PK | `processStatus` | `"UNPROCESSED"` (sparse — removed on process) |
| GSI2 SK | `fetchedAt` | ISO 8601 |

### `{env}-giveaway-posts`
| Key | Attribute | Value |
|-----|-----------|-------|
| PK | `postId` | Twitter tweet ID |
| GSI1 PK | `statusDeadline` | `"{status}#{YYYY-MM-DD}"` e.g. `"active#2026-06-01"` |
| GSI1 SK | `createdAt` | ISO 8601 |

**Sentinel for unknown deadline**: `statusDeadline = "active#9999-12-31"` (sorts to end)

## Claude Tool Schema

```typescript
classify_giveaway_tweet tool:
{
  status: "active" | "ended" | "upcoming" | "not_giveaway",
  prizes: [{ type: "box"|"single"|"other", name: string, count?: number }],
  conditions?: string,   // "フォロー＋RT" など
  deadline?: string,     // "YYYY-MM-DD"
}
```

Model: `jp.anthropic.claude-haiku-4-5-20251001-v1:0` (same as existing parse.ts)

## Search Cursor Management

Broad keyword search `since_id` is stored as a dedicated DynamoDB item in the stores table:
- PK: `GIVEAWAY_SEARCH_CURSOR`
- Attribute: `sinceId: string`

This follows the existing `lastFetchedTweetId` pattern on `StoreItem`.

## Complexity Tracking

| Decision | Justification |
|----------|---------------|
| Two new DynamoDB tables | Separate from oripa-posts schema (different key design, different query patterns) |
| Parallel Lambda pipeline | Giveaway fetch/analyze runs independently from oripa batch to avoid coupling and rate-limit issues |

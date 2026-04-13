# Implementation Plan: AI Tweet Analysis

**Branch**: `006-ai-tweet-analysis` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)

## Summary

Add an analysis Lambda that reads the UNPROCESSED tweet queue (GSI2), sends each tweet to Claude Haiku for classification and field extraction, writes an OripaPost for on_sale/upcoming/sold_out tweets, and marks each tweet as processed. Runs hourly via EventBridge.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS (Lambda `nodejs22.x`)
**Primary Dependencies**: `@anthropic-ai/sdk` (Claude API), `@aws-sdk/lib-dynamodb`, `ulid`
**Storage**: DynamoDB — `tweets` (read+update), `stores` (read), `oripa-posts` (write)
**Testing**: Manual Lambda invocation (integration)
**Target Platform**: AWS Lambda, 5-minute timeout
**Performance Goals**: 50 tweets analyzed per run within 5 minutes
**Constraints**: Claude Haiku rate limits; DynamoDB GSI2 eventual consistency
**Scale/Scope**: ~50 tweets/run max; hourly cadence

---

## Constitution Check

Constitution is a template — no gates to enforce.

---

## Project Structure

### Documentation (this feature)

```text
specs/006-ai-tweet-analysis/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── contracts/
│   └── analyze-lambda.md
└── tasks.md
```

### Source Code

```text
apps/batch/
└── src/
    ├── analyze.ts     # NEW — Lambda handler: orchestrates queue drain + per-tweet analysis
    ├── parse.ts       # REPLACE stub — Claude API call + structured extraction
    ├── save.ts        # MODIFY — add saveOripaPost(), markTweetProcessed()
    └── index.ts       # unchanged (fetch handler)

infra/cdk/
└── lib/
    └── batch-stack.ts # MODIFY — add analyze Lambda + EventBridge rule + SSM for ANTHROPIC_API_KEY
```

---

## Implementation Phases

### Phase A: Dependencies

1. Add `@anthropic-ai/sdk` to `apps/batch/package.json`
2. Store `ANTHROPIC_API_KEY` in SSM: `/oripa-now/${deployEnv}/ANTHROPIC_API_KEY`

### Phase B: Core Logic

3. Implement `apps/batch/src/parse.ts`:
   - `analyzeTweet(client: Anthropic, tweet: TweetItem, todayJST: string): Promise<AnalysisResult>`
   - Uses `tool_use` to enforce JSON schema output
   - Returns `{ status, price?, stockCount?, saleAt? }`

4. Extend `apps/batch/src/save.ts`:
   - `saveOripaPost(docClient, result, tweet, store): Promise<void>` — PutItem to oripa-posts
   - `markTweetProcessed(docClient, tweetId: string): Promise<void>` — UpdateItem: `isProcessed=true`, remove `processStatus`

5. Implement `apps/batch/src/analyze.ts` (new Lambda handler):
   - Query GSI2 for UNPROCESSED tweets (`Limit: ANALYZE_BATCH_SIZE ?? 50`)
   - For each tweet: fetch store (with in-memory cache) → `analyzeTweet` → if not `not_oripa`: `saveOripaPost` → `markTweetProcessed`
   - Per-tweet try/catch: log error, leave UNPROCESSED on failure
   - Return `AnalyzeRunResult`

### Phase C: Infrastructure

6. Update `infra/cdk/lib/batch-stack.ts`:
   - Read `ANTHROPIC_API_KEY` from SSM
   - Add `NodejsFunction` for analyze Lambda (`apps/batch/src/analyze.ts`)
   - Grant read on tweets + stores, read/write on oripa-posts, update on tweets
   - Add EventBridge rule `rate(1 hour)` targeting analyze Lambda

### Phase D: Verification

7. Invoke analyze Lambda manually with UNPROCESSED tweets in queue
8. Verify OripaPost created in oripa-posts table
9. Verify tweet `isProcessed = true` and `processStatus` removed

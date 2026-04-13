# Research: AI Tweet Analysis

**Branch**: `006-ai-tweet-analysis` | **Date**: 2026-04-13

## Decision 1: AI Model

**Decision**: Claude claude-haiku-4-5-20251001 (`claude-haiku-4-5-20251001`) via Anthropic API

**Rationale**:
- Haiku is the fastest and cheapest Claude model — ideal for high-volume, structured extraction tasks
- Sufficient capability for classification + field extraction from short tweet text
- Already used in the project's tech stack (Anthropic is the platform choice)
- Structured output via JSON mode ensures reliable parsing

**Alternatives considered**:
- Claude Sonnet: More capable but ~5x the cost for a task Haiku handles well. Rejected for cost.
- GPT-4o-mini: Similar cost profile but adds an external vendor dependency. Rejected.
- Rule-based parsing (regex): Cannot handle the variability of natural language tweets. Rejected.

---

## Decision 2: Prompt Design — Structured JSON Output

**Decision**: Single prompt asking Claude to return a JSON object with fixed schema. Use `tool_use` (function calling) to enforce structure.

Prompt instructs Claude to:
1. Classify the tweet: `on_sale` / `upcoming` / `sold_out` / `not_oripa`
2. Extract: `price` (number, JPY), `stockCount` (number), `saleAt` (YYYY-MM-DD, JST)
3. For `upcoming` without explicit date: default `saleAt` to tomorrow JST

Tool schema enforces the output shape so no fragile JSON parsing is needed.

**Alternatives considered**:
- Free-form text response + regex extraction: Brittle, fails on format variation. Rejected.
- Separate prompts for classification and extraction: Double the API calls and cost. Rejected.

---

## Decision 3: Lambda Architecture — Separate Analysis Function

**Decision**: Add a new Lambda function `${deployEnv}-oripa-now-analyze` to `BatchStack`, triggered by EventBridge on `rate(1 hour)` offset from the fetch batch.

**Rationale**:
- Separating fetch and analysis keeps each function focused and independently scalable
- A failure in analysis does not affect tweet ingestion
- The GSI2 (`processStatus = "UNPROCESSED"`) provides a clean queue interface between the two functions
- Running on a separate hourly schedule (offset by ~10 minutes) ensures tweets are available before analysis starts

**Alternatives considered**:
- Same Lambda as fetch, sequential: Couples concerns, makes retry logic complex. Rejected.
- Step Functions orchestration: Overhead not justified at this scale. Deferred.
- SQS trigger: Adds infra complexity; hourly poll is simpler for current scale. Deferred.

---

## Decision 4: Batch Size and Cost Control

**Decision**: Process up to 50 UNPROCESSED tweets per run. Query GSI2 with `Limit: 50`.

**Rationale**:
- Haiku pricing: ~$0.80/1M input tokens. A tweet is ~100 tokens → 50 tweets ≈ 5000 tokens ≈ $0.004 per run
- At 24 runs/day with 50 stores active: worst case ~$0.10/day, well within acceptable range
- Limit of 50 prevents runaway cost if the queue grows unexpectedly

**Alternatives considered**:
- Process all UNPROCESSED at once: Risk of Lambda timeout and unbounded cost. Rejected.
- Process 10: Too conservative; backlog builds up. Rejected.

---

## Decision 5: Error Handling — Leave UNPROCESSED on Failure

**Decision**: If the Anthropic API call fails or returns an unparseable response, catch the error, log it with `tweetId`, and **do not** update `isProcessed`. The tweet stays in the UNPROCESSED queue and will be retried on the next run.

**Rationale**:
- Matches FR-007 from the spec
- Prevents data loss from transient API errors
- Natural retry via GSI2 queue without any additional retry infrastructure

**Alternatives considered**:
- Dead-letter queue after N failures: Useful at scale but adds infra. Deferred to v2.
- Mark as `FAILED` with a separate status: More observable but adds schema complexity. Deferred.

---

## Decision 6: Denormalization — Read Store at Analysis Time

**Decision**: At analysis time, fetch the store record (`GetItem` by `storeId`) to denormalize `storeName`, `storeAddress`, and `area` into the OripaPost. Cache store records in memory within a single Lambda invocation.

**Rationale**:
- OripaPost needs `storeName`, `storeAddress`, `areaStatusDate` for the GSI1 query used by the top page
- Reading store at analysis time ensures we always have the latest store metadata
- In-memory cache within one invocation avoids redundant DynamoDB reads for the same store

**Alternatives considered**:
- Denormalize at fetch time (store metadata in TweetItem): More data duplication, changes the fetch contract. Rejected.
- Join at query time: DynamoDB has no joins. Not feasible.

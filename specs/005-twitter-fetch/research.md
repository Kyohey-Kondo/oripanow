# Research: Twitter Data Fetch

**Branch**: `005-twitter-fetch` | **Date**: 2026-04-13

## Decision 1: Twitter API Access Method

**Decision**: Twitter API v2 with Bearer token (App-only auth), using the **Recent Search endpoint** (`GET /2/tweets/search/recent`)

**Rationale**:
- The Recent Search endpoint accepts a query like `from:storeUsername (オリパ OR oripa)`, combining the per-store filter and keyword filter in a single API call — more efficient than fetching all tweets and filtering locally
- Bearer token (App-only auth) is sufficient for reading public tweets; no per-user OAuth flow required
- The search endpoint covers the past 7 days, which is more than enough for an hourly batch
- Free tier allows 500k tweets/month read; Basic ($100/month) allows 1M/month — either is sufficient for a small store list

**Alternatives considered**:
- User timeline endpoint (`GET /2/users/{id}/tweets`): Requires resolving username → numeric user ID first (an extra API call per store). No keyword filtering server-side. Rejected for efficiency.
- Third-party Twitter scrapers (e.g., twitterapi.io, nitter instances): Avoid dependency on unofficial services for production data; TOS risk. Rejected.

**Required environment variable**: `TWITTER_BEARER_TOKEN` — injected into Lambda via CDK environment block and AWS Systems Manager / Secrets Manager.

---

## Decision 2: Keyword Filter List

**Decision**: Static list of oripa-related keywords defined as a constant in the batch source, configurable via environment variable for override.

Default keywords: `オリパ`, `oripa`, `ORIPA` (case-insensitive search handled by Twitter query syntax).

**Rationale**:
- Query string for Twitter: `from:<username> (オリパ OR oripa)`
- Twitter's search is case-insensitive for Latin characters, so `oripa` also matches `ORIPA`
- Keeping the list static in code for v1 avoids the complexity of a keyword management UI and a DynamoDB config table

**Alternatives considered**:
- DynamoDB config table for keywords: Adds a runtime read on every batch run, introduces another entity. Deferred to v2.

---

## Decision 3: Deduplication Strategy

**Decision**: Use Twitter `tweetId` as the deduplication key. Before writing a new `TweetItem`, check if a record with the same `tweetId` already exists via the `GSI1` query on the tweets table (storeId + tweetedAt range). If found, skip.

More efficiently: pass `since_id` to the Twitter API — the batch records the highest `tweetId` seen per store in DynamoDB (as a metadata item or in the store item), and on the next run passes `since_id=<lastTweetId>` so the API only returns newer tweets.

**Rationale**:
- `since_id` prevents the API from returning already-seen tweets entirely, reducing both API quota usage and unnecessary DynamoDB reads
- Falls back to full deduplication check on first run per store (no stored `since_id` yet)

**Implementation**: Add `lastFetchedTweetId?: string` field to `StoreItem`. On each successful store fetch, update this field with the highest `tweetId` returned.

**Alternatives considered**:
- DynamoDB `ConditionExpression` on write (put-if-not-exists): Works but still fetches duplicates from API. Less efficient quota-wise.

---

## Decision 4: Lambda Scheduling

**Decision**: Add an AWS EventBridge (CloudWatch Events) rule with `rate(1 hour)` to the existing `BatchStack` CDK construct, targeting the existing batch Lambda function.

**Rationale**:
- EventBridge Scheduler is the standard serverless cron mechanism for Lambda
- `rate(1 hour)` satisfies the SC-001 success criterion (new tweets appear within 70 minutes of posting)
- The Lambda timeout is currently 30 seconds — increase to 5 minutes to accommodate iterating over multiple stores

**Alternatives considered**:
- External cron (GitHub Actions scheduled workflow calling Lambda): More complex, adds external dependency. Rejected.
- Step Functions: Overhead not justified for a simple sequential batch at this scale. Deferred.

---

## Decision 5: Per-store Error Isolation

**Decision**: Wrap each store's fetch+save operation in a `try/catch`. Log the error with `storeId` and error type. Continue to the next store. After all stores are processed, if any errors occurred, log a summary. The Lambda still returns successfully (does not throw) so EventBridge does not retry the entire run unnecessarily.

**Rationale**:
- Matches FR-005 and FR-006 from the spec
- A single store's Twitter API error (e.g., account suspended, rate limit) should not block the rest
- CloudWatch Logs captures all per-store errors for diagnosis

**Alternatives considered**:
- DLQ (Dead Letter Queue) per failed store: Adds complexity (SQS queue, separate consumer). Deferred to v2 if needed.

---

## Decision 6: Twitter API Client Library

**Decision**: Use the official `twitter-api-v2` npm package (TypeScript-first, supports v2 endpoints natively).

**Rationale**:
- Handles rate limit retries, pagination, and type definitions out of the box
- Well-maintained, widely used in the Node.js ecosystem
- Avoids manual `fetch` wrapping for Twitter's OAuth/Bearer token handling

**Alternatives considered**:
- Raw `fetch` with Bearer token header: Functional but requires manual pagination and type handling. Rejected for maintainability.

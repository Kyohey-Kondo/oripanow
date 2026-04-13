# Tasks: AI Tweet Analysis

**Input**: Design documents from `specs/006-ai-tweet-analysis/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/analyze-lambda.md

**Tests**: Not requested. No test tasks included.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 = On-Sale Extraction, US2 = Upcoming Extraction, US3 = Error Resilience

---

## Phase 1: Setup

**Purpose**: Install dependencies and provision credentials

- [x] T001 Add `@anthropic-ai/sdk` to `apps/batch/package.json` via `pnpm --filter @oripa-now/batch add @anthropic-ai/sdk`
- [ ] T002 [P] Store Anthropic API key in SSM: `aws ssm put-parameter --name "/oripa-now/dev/ANTHROPIC_API_KEY" --type String --value "<key>"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and DynamoDB helpers that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `AnalysisResult` type to `apps/batch/src/parse.ts`: `{ status: 'on_sale' | 'upcoming' | 'sold_out' | 'not_oripa'; price?: number; stockCount?: number; saleAt?: string }`
- [x] T004 [P] Add `AnalyzeRunResult` type to `apps/batch/src/analyze.ts`: `{ runAt: string; tweetsProcessed: number; postsCreated: number; skipped: number; errors: Array<{ tweetId: string; error: string }> }`
- [x] T005 [P] Add `saveOripaPost(docClient, result, tweet, store)` to `apps/batch/src/save.ts` — PutItem to oripa-posts table: generates ULID postId, builds `areaStatusDate` as `"${store.area}#${result.status}#${result.saleAt}"`, denormalizes `storeName` and `storeAddress` from store
- [x] T006 [P] Add `markTweetProcessed(docClient, id)` to `apps/batch/src/save.ts` — UpdateItem on tweets table: set `isProcessed = true`, remove `processStatus` attribute

**Checkpoint**: Shared types and DB helpers ready — user story implementation can begin

---

## Phase 3: User Story 1 — Extract On-Sale Oripa Info (Priority: P1) 🎯 MVP

**Goal**: Unprocessed tweets announcing active oripa sales are classified as `on_sale` and saved as OripaPost records with price, stock count, and sale date extracted.

**Independent Test**: Ensure at least one UNPROCESSED tweet exists in dev-tweets (from the fetch batch), invoke `dev-oripa-now-analyze`, and verify a new record appears in dev-oripa-posts with `status: "on_sale"` and the tweet's `isProcessed` flipped to `true`.

### Implementation for User Story 1

- [ ] T007 [US1] Implement `analyzeTweet(client, tweet, todayJST)` in `apps/batch/src/parse.ts` — calls `client.messages.create` with model read from `process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001'`; uses `tool_use` tool definition enforcing `AnalysisResult` schema; prompt instructs Claude to classify the tweet and extract price (JPY integer), stockCount (integer), saleAt (YYYY-MM-DD JST); returns parsed `AnalysisResult`
- [ ] T008 [US1] Implement `handler` in `apps/batch/src/analyze.ts` — Query GSI2 (`processStatus = "UNPROCESSED"`, `Limit: ANALYZE_BATCH_SIZE ?? 50`) on tweets table; for each tweet: `GetItem` store by `storeId` (cache in `Map<storeId, StoreItem>`); call `analyzeTweet`; if status is not `not_oripa` call `saveOripaPost` then `markTweetProcessed`; return `AnalyzeRunResult`
- [ ] T009 [US1] Update `infra/cdk/lib/batch-stack.ts`: read `ANTHROPIC_API_KEY` from SSM (`ssm.StringParameter.valueForStringParameter`), add new `NodejsFunction` for `${deployEnv}-oripa-now-analyze` (entry: `apps/batch/src/analyze.ts`, timeout 5min, Node 22, all four table env vars + `ANTHROPIC_API_KEY` + `ANALYZE_BATCH_SIZE` + `ANTHROPIC_MODEL: 'claude-haiku-4-5-20251001'`)
- [ ] T010 [US1] Update `infra/cdk/lib/batch-stack.ts`: grant analyze Lambda read access on tweets table, read access on stores table, read/write access on oripa-posts table; add `UpdateItem` IAM grant on tweets table for `markTweetProcessed`
- [ ] T011 [US1] Update `infra/cdk/lib/batch-stack.ts`: add EventBridge rule `rate(1 hour)` targeting analyze Lambda

**Checkpoint**: US1 complete — invoke analyze Lambda and verify on_sale OripaPost created

---

## Phase 4: User Story 2 — Extract Upcoming Sale Info (Priority: P2)

**Goal**: Tweets announcing future sales are classified as `upcoming` and saved as OripaPost with a forward-looking `saleAt` date.

**Independent Test**: Insert a tweet with content "今週土曜日ポケカオリパ販売予定！" into dev-tweets as UNPROCESSED, invoke the analyze Lambda, and verify an OripaPost with `status: "upcoming"` is created.

### Implementation for User Story 2

- [ ] T012 [US2] Extend the prompt in `apps/batch/src/parse.ts` to explicitly handle `upcoming` classification: instruct Claude to set `status: "upcoming"` when the tweet announces a future sale; for tweets without a specific date use tomorrow JST as `saleAt`; include today's date in the prompt context so Claude can reason about relative dates ("明日", "今週末", etc.)

**Checkpoint**: US1 + US2 complete — both on_sale and upcoming tweets produce OripaPost records

---

## Phase 5: User Story 3 — Per-Tweet Error Resilience (Priority: P3)

**Goal**: An AI API failure or parse error for one tweet does not halt processing of other tweets; failed tweets stay UNPROCESSED for automatic retry on the next run.

**Independent Test**: Temporarily pass an invalid API key for one invocation, observe that the Lambda returns a non-zero `errors` array but `tweetsProcessed` still shows the attempted count, and verify no tweets were incorrectly marked as processed.

### Implementation for User Story 3

- [ ] T013 [US3] Wrap the per-tweet `analyzeTweet` → `saveOripaPost` → `markTweetProcessed` sequence in `apps/batch/src/analyze.ts` with a `try/catch` block: on error, push `{ tweetId: tweet.tweetId, error: err.message }` to `errors[]`, log `JSON.stringify({ level: 'ERROR', tweetId, error })`, and continue to the next tweet without calling `markTweetProcessed`
- [ ] T014 [US3] Add post-run summary log in `apps/batch/src/analyze.ts`: `console.log(JSON.stringify({ level: 'INFO', ...result }))` after all tweets are processed

**Checkpoint**: All three user stories complete — errors are isolated, logged, and retryable

---

## Phase 6: Polish & Verification

- [ ] T015 Deploy: `cd infra/cdk && DEPLOY_ENV=dev PATH="..." node_modules/.bin/cdk deploy dev-batch-stack --require-approval never`
- [ ] T016 Invoke analyze Lambda: `aws lambda invoke --function-name dev-oripa-now-analyze --payload '{}' /tmp/analyze-out.json && cat /tmp/analyze-out.json`
- [ ] T017 [P] Verify OripaPost in DynamoDB: `aws dynamodb scan --table-name dev-oripa-posts --query "Items[*].{postId:postId.S,status:status.S,price:price.N,saleAt:saleAt.S}" --output json`
- [ ] T018 [P] Verify tweet marked processed: `aws dynamodb scan --table-name dev-tweets --filter-expression "isProcessed = :t" --expression-attribute-values '{":t":{"BOOL":true}}' --query "Count"`
- [ ] T019 Update `CLAUDE.md` to add `@anthropic-ai/sdk` under Active Technologies for feature 006

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Setup): No dependencies — T001 and T002 can run in parallel
- **Phase 2** (Foundational): Depends on Phase 1; T003, T005, T006 are independent files; T004 is independent
- **Phase 3** (US1): Depends on Phase 2; T007 before T008 (handler calls analyzeTweet); T009–T011 are independent CDK changes
- **Phase 4** (US2): Depends on T007 (extends the prompt in parse.ts)
- **Phase 5** (US3): Depends on T008 (wraps existing handler logic)
- **Phase 6** (Polish): Depends on T015 deploy; T017 and T018 can run in parallel after deploy

### User Story Dependencies

- **US1**: Starts after Phase 2 — independent
- **US2**: Starts after T007 (prompt extension in same file)
- **US3**: Starts after T008 (error wrapping in same file)

---

## Parallel Opportunities

### Phase 1
```
T001 (install SDK) ‖ T002 (SSM key)
```

### Phase 2
```
T003 (AnalysisResult type in parse.ts)
T004 (AnalyzeRunResult type in analyze.ts) ‖ T005 (saveOripaPost in save.ts) ‖ T006 (markTweetProcessed in save.ts)
```

### Phase 3
```
T007 (analyzeTweet in parse.ts)
→ T008 (handler in analyze.ts)
T009 (CDK Lambda def) ‖ T010 (CDK IAM grants) ‖ T011 (CDK EventBridge)
```

### Phase 6
```
T015 (deploy)
→ T016 (invoke)
→ T017 (verify oripa-posts) ‖ T018 (verify tweets)
```

---

## Implementation Strategy

### MVP First (US1 only — T001–T011 + T015–T018)

1. Phase 1: Setup
2. Phase 2: Foundational types + DB helpers
3. Phase 3: analyzeTweet + handler + CDK
4. Deploy and invoke → verify OripaPost created

### Incremental Delivery

1. Phases 1–3 → on_sale tweets produce OripaPost ✅
2. Phase 4 → upcoming tweets also produce OripaPost ✅
3. Phase 5 → errors isolated, retryable ✅
4. Phase 6 → verified in AWS ✅

---

## Notes

- Model is read from `process.env.ANTHROPIC_MODEL`, defaulting to `claude-haiku-4-5-20251001`; set `ANTHROPIC_MODEL` env var in CDK or Lambda console to switch models without code changes
- `tool_use` input schema must match `AnalysisResult` exactly — use `required: ['status']` with optional `price`, `stockCount`, `saleAt`
- `areaStatusDate` format: `"tokyo#on_sale#2026-04-13"` — must match GSI1 partition key used by the top page query
- The analyze Lambda needs separate IAM grants: `tweets` table needs both `Read` and `Update` (for markTweetProcessed)
- `DynamoDB.grantReadWriteData` covers both — but can be split to `grantReadData` (stores) + `grantReadWriteData` (tweets, oripa-posts)

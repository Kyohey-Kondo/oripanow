# Tasks: Twitter Data Fetch (Minimum Viable)

**Input**: Design documents from `specs/005-twitter-fetch/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/batch-lambda.md

**Tests**: Not requested in spec. No test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1 = Scheduled Tweet Fetch, US2 = Error Resilience)

---

## Phase 1: Setup

**Purpose**: Install dependencies and store credentials before any code is written

- [x] T001 Add `twitter-api-v2` dependency to `apps/batch/package.json` via `pnpm --filter @oripa-now/batch add twitter-api-v2`
- [ ] T002 [P] Store Twitter Bearer token in SSM: `aws ssm put-parameter --name "/oripa-now/${DEPLOY_ENV}/TWITTER_BEARER_TOKEN" --type SecureString --value "<token>"`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions and schema changes that every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Add `lastFetchedTweetId?: string` field to `StoreItem` type in `packages/db/schema/index.ts`
- [x] T004 [P] Add `FetchRunResult` type to `apps/batch/src/index.ts` (stores `runAt`, `storesProcessed`, `tweetsWritten`, `errors[]`)

**Checkpoint**: Schema types updated — user story implementation can now begin

---

## Phase 3: User Story 1 — Scheduled Tweet Fetch (Priority: P1) 🎯 MVP

**Goal**: Batch Lambda fetches tweets from registered store Twitter accounts matching oripa keywords, saves new tweets as unprocessed records, and runs on an hourly EventBridge schedule.

**Independent Test**: Manually invoke the Lambda (`aws lambda invoke --function-name ${DEPLOY_ENV}-oripa-now-batch --payload '{}' /tmp/out.json`) and verify `tweetsWritten > 0` and new records appear in the tweets DynamoDB table.

### Implementation for User Story 1

- [x] T005 [P] [US1] Implement `fetchTweetsForStore(client, store, sinceId?)` in `apps/batch/src/fetch.ts` — calls Twitter API v2 Recent Search with query `from:<username> (オリパ OR oripa) -is:retweet`, returns up to 100 `TweetV2` objects
- [x] T006 [P] [US1] Implement `saveTweets(docClient, tweets, store)` in `apps/batch/src/save.ts` — writes each tweet as a `TweetItem` record (ULID `id`, `isProcessed: false`, `processStatus: "UNPROCESSED"`) to the tweets table; returns count of records written
- [x] T007 [US1] Implement `updateLastFetchedTweetId(docClient, storeId, tweetId)` in `apps/batch/src/save.ts` — `UpdateItem` on stores table setting `lastFetchedTweetId` and `updatedAt`
- [x] T008 [US1] Replace health-check handler in `apps/batch/src/index.ts` with the fetch orchestration handler: read all active stores (`Scan` stores table, `FilterExpression: isActive = true`), for each store call `fetchTweetsForStore` → `saveTweets` → `updateLastFetchedTweetId`, return `FetchRunResult`
- [x] T009 [US1] Update `infra/cdk/lib/batch-stack.ts`: increase Lambda timeout from 30 seconds to 5 minutes (`cdk.Duration.minutes(5)`)
- [x] T010 [US1] Update `infra/cdk/lib/batch-stack.ts`: read `TWITTER_BEARER_TOKEN` from SSM Parameter Store and inject into Lambda environment (`ssm.StringParameter.valueForStringParameter`)
- [x] T011 [US1] Update `infra/cdk/lib/batch-stack.ts`: add EventBridge rule with `rate(1 hour)` schedule targeting the batch Lambda (`events.Rule` + `targets.LambdaFunction`)

**Checkpoint**: User Story 1 is fully functional — deploy and manually invoke to verify tweets are being fetched and stored

---

## Phase 4: User Story 2 — Fetch Error Resilience (Priority: P2)

**Goal**: Per-store fetch failures are caught, logged with context, and do not prevent other stores from being processed in the same run.

**Independent Test**: Temporarily set an invalid `twitterUsername` for one store in DynamoDB, invoke the Lambda, and verify: (1) the error appears in `FetchRunResult.errors`, (2) tweets from other stores are still saved successfully.

### Implementation for User Story 2

- [x] T012 [US2] Wrap each store's `fetchTweetsForStore` → `saveTweets` → `updateLastFetchedTweetId` sequence in `apps/batch/src/index.ts` with a `try/catch` block that appends to `errors[]` with `{ storeId, twitterUsername, error: err.message }` and continues to the next store
- [x] T013 [US2] Add structured `console.error` logging inside the catch block in `apps/batch/src/index.ts`: log `{ storeId, twitterUsername, error }` as JSON so CloudWatch Logs Insights can query it
- [x] T014 [US2] Add a post-run summary `console.log` in `apps/batch/src/index.ts`: log the full `FetchRunResult` as JSON on every invocation (success and partial-failure alike)

**Checkpoint**: User Stories 1 and 2 both work — errors for one store are visible in logs while other stores continue unaffected

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Verification and cleanup

- [ ] T015 [P] Deploy updated CDK stack: `cd infra/cdk && pnpm run deploy -- --context deployEnv=dev`
- [ ] T016 Verify the EventBridge rule exists: `aws events list-rules --name-prefix dev-oripa-now`
- [ ] T017 Manually invoke the Lambda and verify `FetchRunResult` shows `tweetsWritten > 0` and `errors: []`
- [ ] T018 [P] Confirm new records in DynamoDB tweets table: `aws dynamodb scan --table-name dev-tweets --filter-expression "isProcessed = :f" --expression-attribute-values '{":f":{"BOOL":false}}' --query "Count"`
- [ ] T019 [P] Confirm `lastFetchedTweetId` is updated on at least one store record: `aws dynamodb get-item --table-name dev-stores --key '{"storeId":{"S":"<any-store-id>"}}'`
- [x] T020 Update `CLAUDE.md` under **Active Technologies** to add `twitter-api-v2` as a dependency for feature 005

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T001 and T002 can run in parallel
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories; T003 and T004 can run in parallel
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion; T005 and T006 can run in parallel (different files); T007 depends on T006 (same file); T008 depends on T005, T006, T007; T009–T011 are independent of each other
- **User Story 2 (Phase 4)**: Depends on T008 (handler exists before adding error wrapping); T012–T014 are sequential edits to the same function
- **Polish (Phase 5)**: Depends on all implementation phases; T015 must precede T016–T019; T017–T019 can run in parallel after deploy

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no dependency on US2
- **US2 (P2)**: Starts after T008 (US1 handler exists) — extends the same handler

---

## Parallel Opportunities

### Phase 1
```
T001 (install package) ‖ T002 (SSM parameter)
```

### Phase 2
```
T003 (StoreItem type) ‖ T004 (FetchRunResult type)
```

### Phase 3 (User Story 1)
```
T005 (fetch.ts) ‖ T006 (save.ts — saveTweets)
→ T007 (save.ts — updateLastFetchedTweetId)
→ T008 (index.ts — handler)
T009 (CDK timeout) ‖ T010 (CDK SSM) ‖ T011 (CDK EventBridge)
```

### Phase 5 (Polish, after deploy)
```
T017 (invoke verify) ‖ T018 (scan tweets table) ‖ T019 (check stores record)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: User Story 1 (T005–T011)
4. **STOP and VALIDATE**: Manually invoke Lambda, verify tweets saved
5. Deploy and confirm EventBridge schedule is active

### Incremental Delivery

1. Phases 1–2 → foundation types ready
2. Phase 3 → MVP: tweets are being fetched and stored hourly ✅
3. Phase 4 → resilience: partial failures don't block other stores ✅
4. Phase 5 → verified in production environment ✅

---

## Notes

- [P] tasks = different files or independent operations, no mutual dependencies
- `twitter-api-v2` provides TypeScript types for `TweetV2` — no need to define custom tweet response types
- The `ulid` package is already used elsewhere in the project for generating `TweetItem.id`
- EventBridge rule requires `events.Rule` + `events.targets.LambdaFunction` from `aws-cdk-lib/aws-events` and `aws-cdk-lib/aws-events-targets`
- Twitter API `since_id` is a string comparison on numeric tweet IDs — no integer overflow risk in TypeScript since we store and pass it as a string

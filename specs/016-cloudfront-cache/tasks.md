# Tasks: CloudFront HTML Caching with Batch Invalidation

**Input**: Design documents from `/specs/016-cloudfront-cache/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Add required dependency before any CDK or Lambda changes.

- [x] T001 Add `@aws-sdk/client-cloudfront: "^3.797.0"` to dependencies in `apps/batch/package.json`
- [x] T002 Run `pnpm install` from repo root to update lockfile

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expose the CloudFront `distribution` object from web-stack so batch-stack can reference its ID. Required before US2 can be implemented.

**⚠️ CRITICAL**: T004 must complete before batch-stack changes (US2).

- [x] T003 Make `distribution` a public readonly field in `infra/cdk/lib/web-stack.ts` (change `const distribution` → `readonly distribution`, declare as class field)
- [x] T004 Update `infra/cdk/bin/app.ts`: create `webStack` before `batchStack` and pass `webStack.distribution.distributionId` as the `cloudFrontDistributionId` prop to `BatchStack`

**Checkpoint**: Foundation ready — US1 and US2 can now proceed in parallel.

---

## Phase 3: User Story 1 — Fast Page Load on Repeat Visits (Priority: P1) 🎯 MVP

**Goal**: Cache HTML responses for `/oripa*` at CloudFront for up to 24 hours, keyed on `area` and `page` query parameters.

**Independent Test**: Deploy and run `curl -sI https://<domain>/oripa | grep X-Cache` twice. Second request must show `Hit from cloudfront`.

- [x] T005 [P] [US1] Add a custom `CachePolicy` (defaultTtl 24h, minTtl 0, maxTtl 24h, queryStringBehavior allowList `area`+`page`, gzip+brotli enabled) to `infra/cdk/lib/web-stack.ts`
- [x] T006 [P] [US1] Change `defaultBehavior.cachePolicy` from `cloudfront.CachePolicy.CACHING_DISABLED` to the new `ssrCachePolicy` in `infra/cdk/lib/web-stack.ts`

**Checkpoint**: After T005+T006, deploying web-stack alone delivers US1 independently.

---

## Phase 4: User Story 2 — Fresh Data After Daily Batch (Priority: P1)

**Goal**: After the analyze Lambda completes each day, invalidate `/oripa*` in CloudFront so visitors see fresh data.

**Independent Test**: Invoke analyze Lambda manually; confirm a CloudFront invalidation for `/oripa*` appears in the distribution's Invalidations tab within 2 minutes. Lambda must return a result (not throw) even if the invalidation call fails.

- [x] T007 [US2] Add `cloudFrontDistributionId?: string` to `BatchStackProps` and pass it as `CLOUDFRONT_DISTRIBUTION_ID` env var to `analyzeFn` in `infra/cdk/lib/batch-stack.ts`
- [x] T008 [US2] Grant `cloudfront:CreateInvalidation` on the distribution ARN to `analyzeFn` in `infra/cdk/lib/batch-stack.ts` (use `analyzeFn.addToRolePolicy`)
- [x] T009 [US2] Add non-fatal CloudFront invalidation call at the end of `handler` in `apps/batch/src/analyze.ts`: read `CLOUDFRONT_DISTRIBUTION_ID` env var, call `CreateInvalidationCommand` with path `/oripa*`, catch and log any error, never throw

**Checkpoint**: After T007–T009, analyze Lambda triggers invalidation on each run. US1 and US2 are both functional.

---

## Phase 5: User Story 3 — Static Assets Unaffected (Priority: P3)

**Goal**: Confirm `/_next/static/*` cache behavior is unchanged after the above changes.

**Independent Test**: After deploying, `curl -sI https://<domain>/_next/static/<any-file>` must show `Cache-Control: public, max-age=31536000, immutable` and `Hit from cloudfront` on repeat requests.

- [ ] T010 [US3] Deploy all stacks (`pnpm cdk deploy --all` from `infra/cdk/`) and run static asset cache verification from `specs/016-cloudfront-cache/quickstart.md`

**Checkpoint**: All three user stories verified.

---

## Phase 6: Polish

- [x] T011 Run `pnpm typecheck` across all workspaces and fix any type errors introduced by the changes
- [x] T012 [P] Run `pnpm lint` and fix any lint errors in changed files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks US2 (T007–T009 require T003+T004)
- **Phase 3 (US1)**: Depends on Phase 1 only — T005+T006 are independent of T003+T004
- **Phase 4 (US2)**: Depends on Phase 2 (T003+T004 must be complete)
- **Phase 5 (US3)**: Depends on Phase 3 + Phase 4 (both stacks must be deployed)
- **Phase 6 (Polish)**: After all implementation is complete

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 1 — only touches `web-stack.ts`
- **US2 (P1)**: Requires Foundational (Phase 2) — touches `batch-stack.ts` and `analyze.ts`
- **US3 (P3)**: Requires US1 + US2 deployed

### Parallel Opportunities

- T003 and T005+T006 can run in parallel (different concerns in the same file, no conflict)
- T005 and T006 touch the same file (`web-stack.ts`) — do sequentially
- T007 and T008 touch the same file (`batch-stack.ts`) — do sequentially
- T011 and T012 (Polish) can run in parallel

---

## Parallel Example: US1 and US2

```
After Phase 1 (Setup) completes:
  Thread A: T003 → T004 → T007 → T008 → T009  (Foundational + US2)
  Thread B: T005 → T006                          (US1, no dependency on Thread A)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 3: US1 (T005–T006)
3. Deploy web-stack: `pnpm cdk deploy prod-web-stack`
4. **STOP and VALIDATE**: `curl -sI https://<domain>/oripa | grep X-Cache` × 2

### Full Delivery (US1 + US2)

1. Complete Phase 1 (T001–T002)
2. Run Phase 2 + Phase 3 in parallel (Thread A + Thread B above)
3. Deploy both stacks: `pnpm cdk deploy --all`
4. Validate US1 (cache hit) + US2 (invalidation in Console) + US3 (static assets)
5. Complete Phase 6 (Polish)

---

## Notes

- [P] tasks = different files, no conflicting edits
- `CLOUDFRONT_DISTRIBUTION_ID` absent in local dev → invalidation is silently skipped
- All `cloudfront:CreateInvalidation` errors must be caught and logged; never rethrown
- `pnpm cdk deploy --all` will deploy `batch-stack` after `web-stack` due to the CDK cross-stack dependency created in T004

# Tasks: CloudFront to Lambda OAC

**Input**: Design documents from `specs/015-cloudfront-lambda-oac/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

---

## Phase 1: Setup

**Purpose**: No new project structure needed — single-file CDK change in existing stack.

- [x] T001 Read `infra/cdk/lib/web-stack.ts` to confirm current state before making changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Validate CDK environment is working before touching live infrastructure.

- [x] T002 Run `cd infra/cdk && pnpm cdk diff` and confirm it runs without errors (baseline diff)

**Checkpoint**: CDK toolchain confirmed working — implementation can begin.

---

## Phase 3: User Story 1 - Direct Lambda URL Access Is Blocked (Priority: P1) 🎯 MVP

**Goal**: Change the Lambda Function URL to require IAM auth, configure CloudFront OAC to sign requests, and add the Lambda resource policy scoped to this distribution.

**Independent Test**: `curl -v https://<lambda-url-id>.lambda-url.ap-northeast-1.on.aws/` returns HTTP 403 Forbidden.

### Implementation for User Story 1

- [x] T003 [US1] In `infra/cdk/lib/web-stack.ts`: change `authType` from `FunctionUrlAuthType.NONE` to `FunctionUrlAuthType.AWS_IAM` in `nextjsFn.addFunctionUrl()`
- [x] T004 [US1] In `infra/cdk/lib/web-stack.ts`: replace `new origins.FunctionUrlOrigin(fnUrl)` with `origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl)` in the CloudFront default behavior
- [x] T005 [US1] In `infra/cdk/lib/web-stack.ts`: add `nextjsFn.addPermission('AllowCloudFrontInvoke', ...)` after the `distribution` is created, granting `lambda:InvokeFunctionUrl` to `cloudfront.amazonaws.com` scoped to `distribution.distributionId`
- [x] T006 [US1] Run `pnpm cdk diff` and verify the diff shows: `AuthType` change, new `AWS::CloudFront::OriginAccessControl`, new `AWS::Lambda::Permission`, and `OriginAccessControlId` added to the default origin
- [ ] T007 [US1] Run `pnpm cdk deploy WebStack` (or staging equivalent) to apply the changes
- [ ] T008 [US1] Retrieve the Lambda Function URL from CDK outputs or AWS console and run `curl -v <lambda-url>` — confirm HTTP 403 Forbidden is returned

**Checkpoint**: Lambda URL is locked down. Direct access returns 403. User Story 1 complete.

---

## Phase 4: User Story 2 - Normal Website Browsing Continues to Work (Priority: P1)

**Goal**: Verify all CloudFront-served pages and static assets continue to load correctly after the OAC change.

**Independent Test**: Open the CloudFront domain in a browser (or via Playwright) — top page, area filter, and shop detail pages all render correctly with HTTP 200.

### Implementation for User Story 2

- [ ] T009 [US2] Take a Playwright screenshot of the CloudFront top page and confirm layout is intact (per CLAUDE.md UI verification rule)
- [ ] T010 [US2] Verify shop detail page loads correctly via CloudFront (HTTP 200, content rendered)
- [ ] T011 [US2] Verify a static asset URL (`/_next/static/*`) returns HTTP 200 from CloudFront/S3 (unaffected by the change)

**Checkpoint**: All CloudFront-served pages work normally. User Story 2 complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T012 [P] Update `docs/architecture.drawio` to annotate the CloudFront→Lambda edge with "OAC (SigV4)" and the Lambda URL node with "authType: AWS_IAM"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1
- **Phase 3 (US1)**: Depends on Phase 2 — T003→T004→T005 are sequential (same file); T006/T007/T008 depend on T005
- **Phase 4 (US2)**: Depends on T007 (deployment must be complete)
- **Phase 5 (Polish)**: Depends on Phase 4

### Within Phase 3

```
T003 → T004 → T005   (sequential edits to web-stack.ts)
                ↓
              T006    (CDK diff verification)
                ↓
              T007    (deploy)
                ↓
              T008    (curl 403 check)
```

### Parallel Opportunities

- T003, T004, T005 edit the same file — must be sequential
- T009, T010, T011 (US2 verification) can run in parallel after T007

---

## Implementation Strategy

### MVP (Minimum Viable Security)

1. Complete Phase 1: Read current file
2. Complete Phase 2: Confirm CDK works
3. Complete Phase 3: Apply OAC changes and verify 403
4. **STOP and VALIDATE**: Confirm Lambda URL is blocked
5. Complete Phase 4: Confirm CloudFront still works

### Rollback

If deployment breaks the site:
1. Revert T003: `authType: NONE`
2. Revert T004: `new origins.FunctionUrlOrigin(fnUrl)`
3. Remove T005: delete the `addPermission` call
4. `pnpm cdk deploy WebStack`

---

## Notes

- T003–T005 are all edits to `infra/cdk/lib/web-stack.ts` — apply in order
- CDK tokens handle the `distribution.distributionId` reference in T005 without circular dependency
- The S3 origin (`/_next/static/*`) is unaffected — no changes needed there
- Playwright screenshot (T009) is required per CLAUDE.md UI verification rule before considering the feature done

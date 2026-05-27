# Tasks: Admin Page with Hash Path and Basic Auth

**Input**: Design documents from `/specs/023-admin-page-auth/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — env var documentation and CDK wiring

- [x] T001 Add `ADMIN_PATH_HASH`, `ADMIN_USER`, `ADMIN_PASS` environment variables to `infra/cdk/lib/web-stack.ts` (inject into Next.js Lambda env)
- [x] T002 [P] Add example entries to `apps/web/.env.local` (ADMIN_PATH_HASH, ADMIN_USER, ADMIN_PASS)

**Checkpoint**: CDK ready to pass admin env vars to Lambda — prerequisite for all stories ✅

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Next.js middleware that enforces path obscurity and Basic Auth — required before any admin route can work

- [x] T003 Create `apps/web/middleware.ts`:
  - Read `ADMIN_PATH_HASH`, `ADMIN_USER`, `ADMIN_PASS` from `process.env`
  - Return 404 for well-known admin paths (`/admin`, `/dashboard`, `/manager`, `/admin-internal`)
  - For paths matching `/<ADMIN_PATH_HASH>` or `/<ADMIN_PATH_HASH>/*`: check `Authorization: Basic <base64>` header
  - Return 401 + `WWW-Authenticate: Basic realm="Admin"` if credentials are missing or wrong
  - Rewrite authenticated requests to `/admin-internal` via `NextResponse.rewrite()`
  - Configure `matcher` to include all relevant paths

**Checkpoint**: Middleware in place — US1 can now be verified, US2/US3 can proceed ✅

---

## Phase 3: User Story 1 — Admin Accesses Protected Page (Priority: P1) 🎯 MVP

**Goal**: The admin can navigate to the hash URL, authenticate, and see a page. Unknown paths return 404.

**Independent Test**: Navigate to `/<hash>` — browser prompts for credentials. Correct creds → page loads. Wrong creds → 401. `/admin` → 404. `/admin-internal` → 404.

- [x] T004 [US1] Create `apps/web/app/admin-internal/page.tsx` with Admin Dashboard
- [x] T005 [US1] Verify `pnpm typecheck` passes after T003 and T004

**Checkpoint**: Full auth flow is working — P1 user story is independently testable and demonstrable ✅

---

## Phase 4: User Story 2 — Admin Dashboard Content (Priority: P2)

**Goal**: Authenticated admin sees useful management data (store count, recent post counts by area).

**Independent Test**: After authentication, the admin page displays store count and per-area post counts for the last 7 days.

- [x] T006 [US2] Create `apps/web/lib/admin.ts` with `fetchAdminStats()` that queries stores (scan) and oripa-posts GSI1 (per area, last 7 days)
- [x] T007 [US2] Update `apps/web/app/admin-internal/page.tsx` to call `fetchAdminStats()` and render store count + per-area post counts
- [x] T008 [P] [US2] Create `apps/web/app/admin-internal/admin-internal.module.css` with layout styles

**Checkpoint**: Admin dashboard shows real data from DynamoDB — P2 story is independently testable ✅

---

## Phase 5: User Story 3 — Hash Path Rotation (Priority: P3)

**Goal**: The operator can change the hash path via env var + redeploy with no code changes.

**Independent Test**: Change `ADMIN_PATH_HASH` in `.env.local`, restart dev server — old path returns 404, new path requires auth.

- [x] T009 [US3] Verified `middleware.ts` reads `ADMIN_PATH_HASH` at runtime via `process.env.ADMIN_PATH_HASH`
- [x] T010 [US3] `quickstart.md` already includes hash rotation procedure

**Checkpoint**: Rotation is validated — P3 story is independently verifiable with a dev-server restart ✅

---

## Phase N: Polish & Verification

**Purpose**: E2E verification and cleanup

- [x] T011 Playwright E2E test against `http://localhost:3003`:
  - `GET /dev123` without auth → 401 ✅
  - `GET /dev123` with correct Basic Auth → 200 with "Admin Dashboard" heading ✅
  - `GET /admin` → 404 ✅
  - `GET /admin-internal` → 404 ✅
  - `GET /dashboard` → 404 ✅
  - `WWW-Authenticate: Basic realm="Admin"` header present in 401 ✅
- [x] T012 [P] `pnpm typecheck` passes — no errors ✅
- [ ] T013 [P] Run `pnpm lint` — ESLint not installed locally, skipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (CDK env wiring) — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 (middleware)
- **US2 (Phase 4)**: Depends on Phase 3 (admin-internal route exists)
- **US3 (Phase 5)**: Depends on Phase 2 (middleware reads env var at runtime)
- **Polish (Phase N)**: Depends on all user stories

### Parallel Opportunities

- T002 can run in parallel with T001
- T008 can run in parallel with T006/T007
- T009 and T010 can run in parallel
- T011, T012, T013 can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Add env vars to CDK
2. Phase 2: Create `middleware.ts`
3. Phase 3: Create placeholder `admin-internal/page.tsx`
4. **STOP and VALIDATE**: Test auth flow with Playwright
5. Deploy if auth is working

### Incremental Delivery

1. Phase 1 + 2 → Middleware ready
2. Phase 3 → Auth flow working (MVP!)
3. Phase 4 → Real dashboard data
4. Phase 5 → Documented rotation procedure
5. Phase N → Full E2E + typecheck

---

## Notes

- `middleware.ts` must be at `apps/web/middleware.ts` (Next.js App Router root)
- The `matcher` config in middleware must include the hash path pattern AND the block list
- Never use `NEXT_PUBLIC_` prefix for `ADMIN_PATH_HASH` — it would expose the hash to the browser bundle
- Basic Auth over HTTPS only — CloudFront handles TLS termination

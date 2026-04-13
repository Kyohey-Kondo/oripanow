# Implementation Plan: Top Page — Stores with Same-Day Stock

**Branch**: `004-top-page-stores` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/004-top-page-stores/spec.md`

## Summary

Replace the stub-data top page with a server-rendered page that queries DynamoDB GSI1 for oripa posts with `status=on_sale` and `saleAt=today (JST)`, deduplicates by store, and displays results sorted newest-first. Unit tests cover all pure processing functions (filter, sort, dedup, cap) as required by FR-006.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: Next.js 15 (App Router, `force-dynamic`), AWS SDK v3 (`@aws-sdk/lib-dynamodb`), Vitest (unit testing)  
**Storage**: DynamoDB — Single Table `oripa-now`, GSI1 (`byAreaStatus`), on-demand capacity  
**Testing**: Vitest (new — to be installed in `apps/web`)  
**Target Platform**: Lambda (via `serverless-http` + standalone Next.js), dev server via `next dev`  
**Project Type**: Web application (Next.js SSR)  
**Performance Goals**: Top page load < 2 seconds (SC-001); p95 API response ≤ 500ms per project requirements  
**Constraints**: Results capped at 50 stores (FR-007); no stale data (FR-005, `force-dynamic`)  
**Scale/Scope**: 2 areas × ≤50 posts per query = ≤100 DynamoDB reads per page load

## Constitution Check

The constitution file is unpopulated (template only) — no gates apply. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/004-top-page-stores/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── db-query.md      # Phase 1 output
│   └── processing.md    # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code

```text
packages/
├── db/
│   ├── schema/
│   │   └── index.ts               # EXISTING — no changes needed
│   └── queries/
│       └── oripa-posts.ts         # NEW: queryOnSalePostsByDate(), getTodayJST()
└── types/
    └── src/
        └── index.ts               # MODIFY: add OripaPostSummary interface

apps/web/
├── app/
│   └── page.tsx                   # MODIFY: use getTodayOnSalePosts()
└── lib/
    ├── posts.ts                   # NEW: pure functions + getTodayOnSalePosts()
    └── __tests__/
        └── posts.test.ts          # NEW: unit tests (FR-006)
```

**Structure Decision**: Monorepo web-app layout. DB query logic lives in `packages/db/queries/` (reusable across apps). Processing/orchestration logic lives in `apps/web/lib/posts.ts` (web-specific business rules). Pure functions are isolated for zero-dependency unit testing.

## Implementation Phases

### Phase A: Add Unit Test Framework (Vitest)

**Files to change**:
- `apps/web/package.json` — add `vitest` and `@vitest/coverage-v8` to `devDependencies`; add `"test": "vitest run"` and `"test:coverage": "vitest run --coverage"` scripts
- `apps/web/vitest.config.ts` — new file; configure `test.environment = "node"`, `test.include = ["lib/**/__tests__/**/*.test.ts"]`

**Verification**: `pnpm --filter @oripa-now/web test` executes without error.

---

### Phase B: Add `OripaPostSummary` to Shared Types

**File**: `packages/types/src/index.ts`

```typescript
export interface OripaPostSummary {
  postId: string;
  storeId: string;
  storeName: string;
  createdAt: string;
  price?: number;
  stockCount?: number;
}
```

**Verification**: `pnpm typecheck` passes.

---

### Phase C: Implement DynamoDB Query (`packages/db/queries/oripa-posts.ts`)

New file. Exports:
- `getTodayJST(): string` — returns today as `YYYY-MM-DD` in JST using `Intl.DateTimeFormat`.
- `queryOnSalePostsByDate(client, tableName, area, dateJST, limit?)` — queries GSI1 with `begins_with` on `GSI1SK`.

**Key implementation details**:
- Use `QueryCommand` from `@aws-sdk/lib-dynamodb`.
- `KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :skPrefix)"`.
- `ScanIndexForward: false`.
- Return `(result.Items ?? []) as OripaPostItem[]`.

**Verification**: TypeScript compiles; function signature matches contract.

---

### Phase D: Implement Processing Functions (`apps/web/lib/posts.ts`)

New file. Exports (all pure):
- `sortNewestFirst(posts: OripaPostItem[]): OripaPostItem[]`
- `deduplicateByStore(posts: OripaPostItem[]): OripaPostItem[]`
- `capResults(posts: OripaPostItem[], limit: number): OripaPostItem[]`
- `mapToSummary(posts: OripaPostItem[]): OripaPostSummary[]`

Also exports the orchestrator:
- `getTodayOnSalePosts(): Promise<OripaPostSummary[]>` — creates DynamoDB client, queries all areas, applies processing pipeline.

**Constants**: `AREAS = ["tokyo", "omiya"]`, `MAX_RESULTS = 50`.

**Verification**: TypeScript compiles.

---

### Phase E: Write Unit Tests (`apps/web/lib/__tests__/posts.test.ts`)

**Test cases** (FR-006 — 100% coverage of defined scenarios):

| Test | Function | Scenario |
|------|----------|----------|
| T-01 | `sortNewestFirst` | Two posts with different `createdAt` — newer appears first |
| T-02 | `sortNewestFirst` | Single post — returns same single-element array |
| T-03 | `sortNewestFirst` | Empty array — returns `[]` |
| T-04 | `deduplicateByStore` | Two posts, same `storeId` — returns only the first (newest) |
| T-05 | `deduplicateByStore` | Two posts, different `storeId` — both returned |
| T-06 | `deduplicateByStore` | Empty array — returns `[]` |
| T-07 | `capResults` | Array of 5, limit 3 — returns first 3 |
| T-08 | `capResults` | Array of 2, limit 50 — returns all 2 |
| T-09 | `mapToSummary` | Correctly maps all fields from `OripaPostItem` |
| T-10 | Pipeline (empty-state) | All functions composed: empty input → `[]` |

**Verification**: `pnpm --filter @oripa-now/web test` — all 10 tests pass.

---

### Phase F: Update Top Page (`apps/web/app/page.tsx`)

**Changes**:
- Remove `STUB_ORIPA_POSTS` import.
- Import `getTodayOnSalePosts` from `../lib/posts`.
- Call `const summaries = await getTodayOnSalePosts()` at the top of the Server Component.
- Render table rows from `summaries` (fields: `storeName`, `createdAt`; optionally `price`, `stockCount`).
- Keep empty-state message for `summaries.length === 0`.
- Keep `export const dynamic = 'force-dynamic'`.

**Verification**: `pnpm --filter @oripa-now/web dev` starts; top page shows either data or empty-state message without errors.

---

## Complexity Tracking

No constitution violations. No complexity justification required.

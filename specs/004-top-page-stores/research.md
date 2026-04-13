# Research: Top Page — Stores with Same-Day Stock

**Feature**: 004-top-page-stores  
**Date**: 2026-04-13

## Decision 1: Unit Test Framework

**Decision**: Vitest

**Rationale**:
- Vitest has first-class ESM and TypeScript 5 support with zero extra Babel/ts-jest config.
- Shares Vite's dependency graph, so it handles pnpm workspace imports (`@oripa-now/db`, `@oripa-now/types`) without additional module resolution hacks.
- `vitest run` is significantly faster than Jest for small unit suites.
- No test framework currently exists in the repo; adding Vitest per-package (devDependency in `apps/web`) is low-friction.

**Alternatives considered**:
- **Jest**: Industry-standard but requires `ts-jest` or `babel-jest` for ESM/TypeScript. The monorepo's pnpm workspace paths add extra transform config. Rejected for added ceremony.
- **Node.js built-in test runner** (`node:test`): Available in Node 22 with no install, but no watch mode, coverage, or describe/it API. Rejected — insufficient DX for a project that mandates unit tests.

---

## Decision 2: DynamoDB Query Strategy for All-Area Top Page

**Decision**: Query each known area in parallel (`Promise.all`), merge in memory, then deduplicate, sort, and cap.

**Rationale**:
- GSI1's partition key is `<area>#<status>` (e.g., `tokyo#on_sale`). There is no "all areas" key — each area must be queried separately.
- The current area set is small (`tokyo`, `omiya`) so 2 parallel queries are negligible cost.
- `ScanIndexForward: false` on each query returns items sorted by SK descending within each area. After merging, a single in-memory sort by `createdAt` descending produces the global newest-first order.
- Keeps the query layer stateless and easy to extend (add new areas without changing the merge logic).

**Alternatives considered**:
- **Single scan with filter expression**: A full GSI scan filtered to today's date would work but is wasteful — DynamoDB charges per read unit regardless of filter outcome. Rejected.
- **Global area key** (e.g., `GSI1PK=ALL#on_sale`): Would require a schema change and backfill. Out of scope.

**Query pattern (pseudocode)**:
```
GSI1 = "byAreaStatus"
PK = "<area>#on_sale"
SK begins_with "<YYYY-MM-DD>"   # today in JST
ScanIndexForward = false         # newest first within area
```

---

## Decision 3: JST Date Handling in Node.js

**Decision**: Use `Intl.DateTimeFormat` with `timeZone: "Asia/Tokyo"` to derive today's date string.

**Rationale**:
- Node.js 22 on Lambda runs in UTC. Without timezone adjustment, posts with a `saleAt` date of "today" in JST would be missed after midnight UTC (i.e., 09:00 JST) if we compare against a UTC date.
- `Intl.DateTimeFormat` is built-in (no extra library) and produces a reliable `YYYY-MM-DD` string for JST.

**Alternatives considered**:
- **`date-fns-tz` / `luxon`**: Third-party libraries that handle timezones well, but introduce dependencies. Built-in `Intl` is sufficient for this single use case. Rejected.
- **`TZ=Asia/Tokyo` environment variable**: Setting the Node.js process timezone works but is a Lambda environment concern, not application-level. Not reliable across environments. Rejected.

**Implementation**:
```typescript
export function getTodayJST(): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/\//g, "-"); // "2026/04/13" → "2026-04-13"
}
```

---

## Decision 4: Deduplication Strategy (One Entry per Store)

**Decision**: Deduplicate by `storeId` after merging area results, keeping the post with the latest `createdAt`.

**Rationale**:
- A store may publish multiple oripa posts on the same day. The spec requires showing each store once, representing its most recent post.
- Because results are sorted newest-first before deduplication, the first occurrence of each `storeId` in the sorted array is always the most recent — making deduplication a single O(n) pass.

**Alternatives considered**:
- **DynamoDB-level deduplication**: Not possible without aggregation features DynamoDB does not have. Rejected.
- **Deduplicate before sort**: Slightly more complex; requires grouping then picking the max per group. Rejected in favor of sort-then-deduplicate.

---

## Decision 5: Architecture — Pure Functions for Processing Logic

**Decision**: Implement filtering, sorting, deduplication, and capping as pure functions in `apps/web/lib/posts.ts`, separate from the DynamoDB query function.

**Rationale**:
- FR-006 mandates unit tests for filtering, sorting, and empty-state. Pure functions accept arrays and return arrays — they require no mocking and run in milliseconds.
- The DynamoDB query function (`packages/db/queries/oripa-posts.ts`) handles I/O separately and can be tested with a DynamoDB mock or integration tests in a future phase.
- Separation of concerns: the web app's `lib/posts.ts` owns business rules (what to show); `packages/db/queries/` owns data access (how to fetch).

---

## Decision 6: Local Development Data

**Decision**: Keep `apps/web/src/stubs/oripa-posts.ts` for local dev reference, but the live page always queries DynamoDB. Seed data instructions are in `quickstart.md`.

**Rationale**:
- The spec requires data freshness (FR-005). The stub module won't satisfy this — it always shows the same hardcoded posts regardless of date.
- For P2, the page uses real DynamoDB. Developers run against a local DynamoDB (e.g., DynamoDB Local) or the deployed dev table.
- Unit tests use in-memory fixture arrays and never touch DynamoDB.

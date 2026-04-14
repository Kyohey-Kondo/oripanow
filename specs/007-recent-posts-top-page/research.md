# Research: Recent On-Sale Posts on Top Page

## Decision 1: Query Strategy — Multi-Day vs. New GSI

**Decision**: Multi-day parallel query against existing GSI1 (no schema change)

**Rationale**:
- GSI1 PK is `areaStatusDate = "{area}#on_sale#{YYYY-MM-DD}"`, which requires an exact date match.
- Adding a new GSI (PK = `{area}#on_sale`, SK = `saleAt#createdAt`) would allow a single query per area but requires: CDK GSI addition, attribute backfill for existing records, and a CDK deploy.
- The multi-day approach queries the last 14 dates in parallel via `Promise.all`. Empty-date queries return instantly (<10 ms each). Total latency is bounded by the slowest non-empty date, not the number of queries.
- 2 areas × 14 days = 28 parallel queries — well within DynamoDB's throughput model for on-demand capacity.

**Alternatives considered**:
- New GSI (rejected — CDK/backfill overhead disproportionate to feature scope)
- GSI2 per-store scan (rejected — requires knowing all store IDs upfront; N+1 query pattern)
- DynamoDB Scan (rejected — expensive; not acceptable)

---

## Decision 2: Lookback Window — 14 Days

**Decision**: 14 days

**Rationale**: Covers two full weeks of sale cycles. Stores inactive for >14 days are considered stale and excluded. This balances freshness with avoiding noise from very old data. The value is a named constant (`LOOKBACK_DAYS = 14`) so it can be changed without searching through logic.

---

## Decision 3: `saleAt` Exposure in `OripaPostSummary`

**Decision**: Add `saleAt: string` to the shared `OripaPostSummary` type in `packages/types/src/index.ts`.

**Rationale**: The top page needs to display the advertised sale date per row so users can assess data freshness. `saleAt` is already present on `OripaPostItem` (the DynamoDB record). Surfacing it in `OripaPostSummary` avoids leaking raw `OripaPostItem` to the web layer.

---

## Decision 4: Display — Sale Date Column

**Decision**: Add a "Sale Date" column showing `saleAt` (YYYY-MM-DD in JST). Rename "Updated At" to "Analyzed At" to more accurately describe `createdAt` (the time the tweet was AI-analyzed).

**Rationale**: Users need to distinguish "when was the sale advertised" from "when did our system pick it up". Without `saleAt` on the page, data from 5 days ago looks identical to data from today.

---

## No Unknowns Remaining

All implementation decisions are resolved. No NEEDS CLARIFICATION items.

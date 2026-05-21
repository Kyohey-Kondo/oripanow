# Research: Pokémon Card Giveaway Campaign Page

**Feature**: 022-pokeca-giveaway-page
**Date**: 2026-05-21

## Decision 1: Twitter Search Strategy

**Decision**: Use two parallel strategies — (A) per-store `from:{username}` queries reusing existing store account list, and (B) a single broad keyword search for giveaways beyond tracked stores.

**Rationale**: Store accounts are high-signal (already producing oripa content, likely to run giveaways), but limiting to only stores would miss major community accounts, game makers, and influencers who also run Pokémon card giveaways.

**Alternatives considered**:
- Store accounts only → misses community/brand accounts
- Broad search only → misses giveaways that stores don't mention with generic keywords

## Decision 2: Separate DynamoDB Tables

**Decision**: Create two new tables (`giveaway-tweets`, `giveaway-posts`) rather than reusing existing `tweets` / `oripa-posts`.

**Rationale**: The key design for giveaway-posts differs from oripa-posts (GSI on `statusDeadline` vs `areaStatusDate`). Mixing them would require complex key redesign and could break existing queries.

**Alternatives considered**:
- Extend oripa-posts with a `contentType` field → conflicting GSI key design, adds complexity to existing queries

## Decision 3: GSI Design for Giveaway Posts

**Decision**: GSI1 uses `statusDeadline = "{status}#{YYYY-MM-DD}"` as PK and `createdAt` as SK. Unknown deadlines use sentinel `"active#9999-12-31"`.

**Rationale**: Mirrors the `areaStatusDate` composite key pattern from oripa-posts. Allows efficient fan-out queries (one per date) using `Promise.all`, which is the established pattern in `queryRecentOnSalePostsByArea`. Sentinel value naturally sorts unknown-deadline items to the end of the list.

**Alternatives considered**:
- Scan all active items and filter in application → inefficient at scale
- Use separate "no-deadline" GSI → adds another index, complicates queries

## Decision 4: Claude Haiku for Analysis

**Decision**: Use `jp.anthropic.claude-haiku-4-5-20251001-v1:0` (same model as existing oripa analysis in `parse.ts`).

**Rationale**: Proven in production for Japanese tweet analysis in this project. Sufficient capability for structured extraction of giveaway fields (prizes, conditions, deadline). Cost-efficient at batch scale.

**Alternatives considered**:
- Claude Sonnet → higher cost, not needed for this extraction task
- Rule-based regex → brittle against diverse Japanese phrasing

## Decision 5: Search Cursor Storage

**Decision**: Store the broad keyword search `since_id` as a dedicated DynamoDB item in the stores table with `PK = "GIVEAWAY_SEARCH_CURSOR"`.

**Rationale**: Follows the existing `lastFetchedTweetId` pattern on `StoreItem`. No new infrastructure needed. Simple GetItem/PutItem operations.

**Alternatives considered**:
- SSM Parameter Store → adds a new AWS service dependency
- Hardcoded lookback window → re-processes old tweets on every run, wastes Bedrock quota

## Decision 6: Once-Daily Schedule

**Decision**: Run fetch at 10:00 JST and analyze at 10:10 JST, once per day.

**Rationale**: Giveaway campaigns have day-level granularity (deadlines are dates, not times). Near-real-time is not required. Offset by 10 minutes from existing oripa batch (10:00 JST fetch, 10:00 JST analyze) to avoid Twitter API rate-limit collisions.

**Alternatives considered**:
- Multiple runs per day → unnecessary given giveaway nature; increases Twitter API usage

## Decision 7: No Tweet Embed Sidebar

**Decision**: The `/giveaway` page uses structured GiveawayCard components only; no oEmbed sidebar unlike the oripa page.

**Rationale**: The oripa page sidebar is for browsing tweet context quickly. Giveaway cards already contain the most important info (prize, conditions, deadline). Adding oEmbed would increase page complexity without clear benefit.

**Alternatives considered**:
- Add oEmbed sidebar → clutters page, tweets for giveaways tend to be more verbose

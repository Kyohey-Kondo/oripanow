# Feature Specification: CloudFront HTML Caching with Batch Invalidation

**Feature Branch**: `016-cloudfront-cache`
**Created**: 2026-04-26
**Status**: Draft
**Input**: User description: "CloudFront に 24h TTL キャッシュを設定し、解析バッチ完了後に invalidation を実行する"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Page Load on Repeat Visits (Priority: P1)

A site visitor opens the oripa top page or a shop detail page. Because content is cached at the CDN edge closest to them, the page loads quickly without waiting for the origin server to process each request.

**Why this priority**: Reduces perceived latency for every visitor. The batch updates data once per day, so CDN caching for up to 24 hours is safe and significantly reduces origin load.

**Independent Test**: Can be fully tested by making two successive requests to `/oripa` and confirming the second request is served from CDN cache (via response headers), delivering value as reduced latency and origin load.

**Acceptance Scenarios**:

1. **Given** a visitor loads `/oripa` for the first time today, **When** they (or another visitor) reload the same URL within 24 hours, **Then** the response is served from CDN cache without reaching the origin server.
2. **Given** a visitor loads `/oripa?area=akihabara`, **When** another visitor loads `/oripa?area=kawagoe`, **Then** each area filter URL is cached and served independently.
3. **Given** a visitor loads `/oripa?area=akihabara&page=2`, **When** the same URL is requested again within 24 hours, **Then** the paginated response is served from cache.

---

### User Story 2 - Fresh Data After Daily Batch (Priority: P1)

After the daily data analysis batch completes (around 00:10 JST), the CDN cache for all oripa pages is invalidated automatically. Visitors loading the site from that point onward see the latest data from that day's batch.

**Why this priority**: Without this, visitors would see stale data for up to 24 hours after the batch updates DynamoDB — which is unacceptable for a site whose value is daily freshness.

**Independent Test**: Can be fully tested by confirming that after a simulated batch completion event, a fresh request to `/oripa` reaches the origin and returns updated content.

**Acceptance Scenarios**:

1. **Given** cached pages exist, **When** the analyze batch Lambda completes successfully, **Then** the CDN cache for `/oripa*` is invalidated within 2 minutes.
2. **Given** the invalidation has completed, **When** a visitor loads `/oripa`, **Then** the response reflects the latest batch data and a new cache entry is created.
3. **Given** the analyze batch completes with partial errors (some tweets failed), **When** at least one post was successfully created or updated, **Then** invalidation still fires.
4. **Given** the analyze batch completes with zero posts processed (nothing changed), **When** the batch finishes, **Then** invalidation still fires to ensure consistency.

---

### User Story 3 - Static Assets Remain Unaffected (Priority: P3)

Static assets (`/_next/static/*`) are not touched by this change. Their existing long-lived cache behavior continues to work correctly.

**Why this priority**: Correctness guard — the static asset cache is already working and must not regress.

**Independent Test**: Can be tested by confirming static asset responses still have long cache TTLs after the change.

**Acceptance Scenarios**:

1. **Given** a static asset is cached, **When** a batch invalidation runs for `/oripa*`, **Then** the static asset cache is not affected.

---

### Edge Cases

- What happens when the batch invalidation API call fails? The CDN cache will naturally expire within 24 hours, so data will eventually be fresh. The failure should be logged but must not cause the batch Lambda to fail.
- What happens when the same URL is requested with unknown query parameters (e.g., `/oripa?utm_source=x`)? Unknown query parameters are not part of the cache key and are ignored, so they do not create unbounded cache entries.
- What happens on the day after midnight JST if the batch has not yet run? Visitors see yesterday's data, which is the expected behavior — freshness is guaranteed only after each daily batch.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CDN MUST cache HTML responses for `/oripa` and all sub-paths (including `/oripa/shops/*`) for up to 24 hours.
- **FR-002**: The cache key for HTML responses MUST include the `area` and `page` query parameters so that each unique combination is cached separately.
- **FR-003**: Query parameters other than `area` and `page` MUST NOT be included in the cache key (to prevent cache fragmentation from tracking parameters).
- **FR-004**: The analyze batch MUST trigger a CDN cache invalidation for all oripa pages (`/oripa*`) immediately after completing its processing run.
- **FR-005**: A batch invalidation failure MUST be logged and MUST NOT cause the batch run to be marked as failed or prevent the result from being returned.
- **FR-006**: The static asset cache (`/_next/static/*`) MUST remain unchanged (long-lived cache, not affected by batch invalidation).
- **FR-007**: The CDN MUST serve cached responses for repeated requests to the same URL within the 24-hour window, bypassing the origin server.

### Key Entities

- **CDN Cache Entry**: A cached HTML response identified by URL path + `area` + `page` query parameters. Has a maximum TTL of 24 hours; invalidated on demand after each daily batch.
- **Batch Invalidation Event**: A signal emitted by the analyze batch Lambda on completion, which triggers deletion of all oripa-path cache entries. Logged regardless of success or failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Repeated requests to the same oripa page URL within 24 hours are served from CDN cache (origin requests reduced to at most 1 per URL per day under normal conditions).
- **SC-002**: After the daily batch completes, all cached oripa pages are invalidated within 2 minutes.
- **SC-003**: Each unique `area` + `page` combination is cached and invalidated independently, with no cross-contamination between URL variants.
- **SC-004**: Batch invalidation failure does not increase the analyze batch error count — it is treated as a non-fatal, logged side effect.
- **SC-005**: Static asset cache hit rate is unchanged after this feature is deployed.

## Assumptions

- The batch runs once per day at approximately 00:10 JST; there is no mid-day data refresh that would require additional invalidation.
- The CDN distribution already exists and fronts the SSR origin; no new distribution needs to be created.
- Cache invalidation paths (`/oripa*`) cover all user-facing oripa URLs including area filters, pagination, and shop detail pages.
- The minimum TTL can be 0 seconds (no forced minimum) to allow origin-controlled no-cache headers to take effect when needed.
- Tracking/analytics query parameters (e.g., `utm_source`) are not used for content differentiation and must not be included in the cache key.
- The analyze batch is the only process that updates oripa post data; no manual edits or other Lambda functions write to oripa posts outside of the batch.

# Feature Specification: Twitter Data Fetch (Minimum Viable)

**Feature Branch**: `005-twitter-fetch`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "Twitterからのデータ取得の機能実装に移りたい。最小昨日から始めたい。何から取り組もうか"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scheduled Tweet Fetch (Priority: P1)

A batch job runs on a schedule and searches Twitter for posts from registered stores that contain oripa-related keywords. For each matching tweet, the system stores the raw tweet data so it can be processed later.

**Why this priority**: This is the data acquisition foundation — without it, no downstream features (AI analysis, top page display) have new content. Every other story depends on this running successfully.

**Independent Test**: Can be tested by triggering the batch job manually and verifying that tweet records appear in the data store for at least one registered store account.

**Acceptance Scenarios**:

1. **Given** a list of registered store Twitter accounts, **When** the batch job runs, **Then** new tweets containing oripa keywords are saved as unprocessed records in the data store
2. **Given** a tweet was already fetched in a previous run, **When** the batch job runs again, **Then** the duplicate tweet is not saved a second time
3. **Given** a store account has posted no new tweets, **When** the batch job runs, **Then** no error occurs and existing records are unchanged

---

### User Story 2 - Fetch Error Resilience (Priority: P2)

When the Twitter API is temporarily unavailable or returns rate-limit errors for a specific store account, the batch job continues processing other accounts and records the failure for observability.

**Why this priority**: Without resilience, a single API error stops all data ingestion. Partial fetch is better than no fetch.

**Independent Test**: Can be tested by simulating a network error for one store account and verifying that tweets from other accounts are still saved.

**Acceptance Scenarios**:

1. **Given** the Twitter API returns a rate-limit error for account A, **When** the batch job runs, **Then** accounts B and C are still fetched and saved successfully
2. **Given** a fetch error occurs, **When** the batch job finishes, **Then** the error is logged with enough detail to diagnose the cause

---

### Edge Cases

- What happens when a store account has been suspended or deleted on Twitter?
- How does the system handle tweets that contain no oripa keywords but were posted by a registered store?
- What happens when the batch job runs while a previous run is still in progress?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST periodically search Twitter for tweets from registered store accounts
- **FR-002**: The system MUST filter fetched tweets to only those containing oripa-related keywords
- **FR-003**: The system MUST save each new tweet as an unprocessed record with: store ID, tweet ID, tweet text, posted-at timestamp, and fetch timestamp
- **FR-004**: The system MUST skip tweets that already exist in the data store (idempotent fetch)
- **FR-005**: The system MUST continue processing remaining store accounts if one account's fetch fails
- **FR-006**: The system MUST log errors with sufficient context (account identifier, error type) for diagnosis
- **FR-007**: The system MUST support a minimum fetch interval of once per hour per store account

### Key Entities

- **Store**: A registered store account with an associated Twitter handle; source of tweet data
- **Tweet (raw)**: A captured tweet record containing the original text, tweet ID, posted-at time, fetch time, and a link back to the store; starts in an "unprocessed" state
- **Fetch Run**: A single execution of the batch job; tracks start time, accounts processed, success/failure counts

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New tweets from registered stores appear in the data store within 70 minutes of being posted (hourly batch + processing buffer)
- **SC-002**: A single account fetch failure does not prevent tweets from other accounts being saved in the same run
- **SC-003**: Re-running the batch job produces no duplicate tweet records
- **SC-004**: 100% of fetch runs produce a log entry indicating completion status, even when errors occur

## Assumptions

- The registered store list is already maintained in the existing data store (from prior features)
- Only public Twitter accounts are targeted; no private account access is required
- Oripa-related keywords are defined as a static list managed in configuration for v1 (dynamic keyword management is out of scope)
- The Twitter API credentials are provisioned separately and available to the batch job at runtime
- Mobile/web UI for managing fetch settings is out of scope; configuration is file/environment-based
- AI analysis of fetched tweets is a downstream concern and out of scope for this feature

# Feature Specification: X Auto Post for Oripa Information

**Feature Branch**: `018-x-auto-post`  
**Created**: 2026-05-04  
**Status**: Draft  
**Input**: User description: "SNSマーケ用のXアカウントを作成したので、このアカウントでオリパ情報を定期投稿したい"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily On-Sale Oripa Posts (Priority: P1)

Each morning, the system automatically posts the day's on-sale oripa information to the marketing X account, grouped by area, so that followers can quickly discover what is available near them.

**Why this priority**: Core purpose of the feature — driving traffic to oripanow by surfacing daily inventory on X.

**Independent Test**: Can be tested by triggering the post job manually and verifying that a tweet appears on the marketing X account containing accurate oripa data matching what is stored in the system.

**Acceptance Scenarios**:

1. **Given** there are on-sale oripa posts for Akihabara today, **When** the scheduled post job runs, **Then** one tweet is posted for Akihabara showing the count of on-sale posts and a link to the area page on oripanow.
2. **Given** an area has no on-sale oripa posts today, **When** the scheduled post job runs, **Then** no tweet is posted for that area.
3. **Given** the post job runs successfully, **When** checking the marketing X account, **Then** one tweet per area with on-sale posts appears, each within the 280-character limit.

---

### User Story 2 - Resilient Posting with Partial Failures (Priority: P2)

If posting fails for one area (e.g., due to a transient API error), the system continues attempting to post for remaining areas and logs the failure without crashing.

**Why this priority**: Ensures partial success is better than total failure — followers in other areas still receive information.

**Independent Test**: Can be tested by simulating an API error for one area and verifying that other areas are posted successfully and the failure is logged.

**Acceptance Scenarios**:

1. **Given** posting for Ikebukuro fails due to an API error, **When** the post job runs, **Then** tweets for Akihabara, Shinjuku, Kawagoe, and Omiya are still posted (if they have data).
2. **Given** all API calls fail, **When** the post job runs, **Then** the job completes without crashing and all errors are logged.

---

### Edge Cases

- What happens when the tweet text exceeds 280 characters? Not applicable — the count-based summary format is always well within the limit.
- What happens when the X API rate limit is reached? The failure is logged and the job does not retry immediately.
- What happens when oripa posts have no price or stock information? The tweet omits those fields for that store.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically post on-sale oripa information to the marketing X account once per day.
- **FR-002**: System MUST group posts by area (akihabara, ikebukuro, shinjuku, kawagoe, omiya) and post one tweet per area that has on-sale oripa.
- **FR-003**: System MUST skip posting for areas that have no on-sale oripa for the current day.
- **FR-004**: Each tweet MUST show the count of on-sale oripa posts for the area and a direct link to that area's page on oripanow.
- **FR-005**: Each tweet MUST include hashtags #ポケカ #ポケモン #オリパ and an area-specific hashtag (e.g., #秋葉原).
- **FR-006**: Each tweet MUST be within the 280-character limit of the X platform.
- **FR-008**: System MUST continue posting to remaining areas if posting to one area fails, and MUST log all failures.
- **FR-009**: Posting MUST be scheduled to run after the daily AI analysis job completes (currently at 09:10 JST), so all newly extracted oripa data is included.
- **FR-010**: X API credentials for the marketing account MUST be stored securely and not exposed in source code or logs.

### Key Entities

- **OripaPost**: Represents a single oripa sale extracted from a store's tweet. Key attributes relevant to posting: store name, area, price, stock count, last-one prize name, sale date, status.
- **Area Tweet**: A composed X post covering all on-sale oripa for a specific geographic area. It is ephemeral — generated at post time and not persisted separately.
- **Marketing X Account**: The dedicated oripanow account from which posts are made. Authenticated via OAuth 1.0a credentials stored in secure configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tweet for each area with on-sale oripa is posted to the marketing X account by 09:30 JST each day.
- **SC-002**: Every posted tweet is within the 280-character limit.
- **SC-003**: Areas with no on-sale oripa produce zero tweets (no empty or placeholder posts).
- **SC-004**: When the job completes, a structured log entry records the number of areas posted, number of tweets sent, and any errors — enabling operational monitoring.
- **SC-005**: A partial API failure for one area does not prevent posting for other areas; at least N-1 areas succeed when one fails.

## Assumptions

- The marketing X account has been created and the developer app has "Read and Write" permissions.
- API credentials (API Key, API Secret, Access Token, Access Token Secret) will be obtained by the operator and stored in the existing secure configuration store (AWS SSM Parameter Store).
- The existing batch infrastructure (Lambda + EventBridge) is reused; no new infrastructure patterns are introduced.
- The existing AI analysis job is assumed to complete by 09:10 JST; the post job is scheduled for 09:20 JST.
- Only oripa posts with `status: on_sale` for the current day are included; `upcoming` and `sold_out` posts are excluded from auto-posting.
- The oripanow website URL used in tweets is a fixed value set in configuration (not dynamic).
- Mobile support and tweet threading (reply chains) are out of scope for v1; each area produces a single independent tweet.
- Tweet history or duplicate detection (preventing the same tweet from being posted multiple times) is handled by the daily schedule — the job runs exactly once per day.

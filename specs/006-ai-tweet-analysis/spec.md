# Feature Specification: AI Tweet Analysis

**Feature Branch**: `006-ai-tweet-analysis`
**Created**: 2026-04-13
**Status**: Draft
**Input**: User description: "UNPROCESSEDなツイートをAIで解析してオリパ情報を抽出する。現在の発売情報（on_sale）に加えて販売予定（upcoming）も取得したい。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Extract On-Sale Oripa Info from Tweet (Priority: P1)

A batch job reads unprocessed tweets and uses AI to determine whether each tweet is announcing a currently active oripa sale. For matching tweets, it extracts structured information (price, stock count, sale date) and saves it as an OripaPost with status `on_sale`.

**Why this priority**: This is the core value of the system — converting raw tweets into structured data that can be displayed on the top page. Without this, the frontend has no real content to show.

**Independent Test**: Insert a tweet with content like "本日ポケカオリパ3000円50パック販売中！" into the UNPROCESSED queue, run the analysis batch, and verify an OripaPost with `status: "on_sale"`, `price: 3000`, `stockCount: 50` is created and the tweet's `isProcessed` is set to `true`.

**Acceptance Scenarios**:

1. **Given** a tweet containing an active oripa sale announcement, **When** the analysis batch runs, **Then** an OripaPost is created with `status: "on_sale"`, extracted price, stock count, and sale date
2. **Given** a tweet that is not about oripa (e.g., a store closure notice), **When** the analysis batch runs, **Then** no OripaPost is created and the tweet is marked as processed
3. **Given** a tweet where price or stock count is not mentioned, **When** the analysis batch runs, **Then** an OripaPost is still created with those fields omitted

---

### User Story 2 - Extract Upcoming Sale Info from Tweet (Priority: P2)

The AI also identifies tweets announcing future oripa sales (e.g., "明日販売予定", "今週末オリパやります") and saves them as OripaPost with status `upcoming`, so users can plan ahead.

**Why this priority**: Upcoming sales are a key use case — users want to know what's coming, not just what's on sale today. This differentiates the service from a simple "today's sales" list.

**Independent Test**: Insert a tweet with content like "今週土曜日にポケカオリパ販売予定です！" into the UNPROCESSED queue, run the analysis batch, and verify an OripaPost with `status: "upcoming"` and a future `saleAt` date is created.

**Acceptance Scenarios**:

1. **Given** a tweet announcing a future sale with a specific date, **When** the analysis batch runs, **Then** an OripaPost is created with `status: "upcoming"` and `saleAt` set to that date
2. **Given** a tweet announcing a future sale without a specific date (e.g., "今週末"), **When** the analysis batch runs, **Then** an OripaPost is created with `status: "upcoming"` and a best-effort `saleAt` estimate
3. **Given** a tweet announcing a sold-out event, **When** the analysis batch runs, **Then** an OripaPost is created with `status: "sold_out"`

---

### User Story 3 - Resilient Processing with Per-Tweet Error Handling (Priority: P3)

If the AI analysis fails for one tweet (e.g., API timeout, unexpected response format), the batch continues processing the remaining tweets and logs the failure.

**Why this priority**: Robustness ensures the batch keeps running even when individual tweets cause AI errors. Without this, a single malformed tweet could halt all processing.

**Independent Test**: Insert a tweet that causes an AI parsing failure, run the batch, and verify the remaining tweets in the queue are still processed and the failed tweet is logged with an error.

**Acceptance Scenarios**:

1. **Given** one tweet causes an AI API error, **When** the analysis batch runs, **Then** other tweets in the queue are still analyzed and the error is logged
2. **Given** the AI returns an unparseable response for a tweet, **When** the analysis batch runs, **Then** the tweet remains UNPROCESSED (so it can be retried) and the error is logged

---

### Edge Cases

- What if the same tweet is processed twice (concurrent batch runs)?
- What if the AI extracts a past date as `saleAt` for an `upcoming` status?
- What if a tweet mentions multiple oripa events (e.g., morning and evening)?
- What if the tweet is in English or a mix of Japanese and English?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST read all tweets with `processStatus = "UNPROCESSED"` from the data store
- **FR-002**: For each unprocessed tweet, the system MUST send the tweet content to an AI model for analysis
- **FR-003**: The AI MUST classify each tweet as one of: `on_sale`, `upcoming`, `sold_out`, or `not_oripa`
- **FR-004**: For tweets classified as `on_sale`, `upcoming`, or `sold_out`, the system MUST extract: price (JPY), stock count, and sale date
- **FR-005**: For each classified tweet (excluding `not_oripa`), the system MUST create an OripaPost record with the extracted fields and the store's area and name denormalized from the store record
- **FR-006**: After successful processing, the system MUST mark the tweet as `isProcessed: true` and remove `processStatus` (sparse index cleanup)
- **FR-007**: If AI analysis fails for a tweet, the system MUST leave the tweet as UNPROCESSED and log the error — it must NOT mark the tweet as processed
- **FR-008**: The system MUST process tweets in batches to stay within AI API rate limits

### Key Entities

- **TweetItem** (modified): `isProcessed` flipped to `true`, `processStatus` removed after successful analysis
- **OripaPost**: New record created per analyzed tweet; includes `status`, `price?`, `stockCount?`, `saleAt`, `rawText`, `storeId`, `tweetId`, denormalized `storeName`, `storeAddress`, `areaStatusDate`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A tweet announcing a current sale appears as an OripaPost on the top page within 70 minutes of being posted (combined fetch + analysis batch latency)
- **SC-002**: A tweet announcing a future sale appears in the upcoming section within 70 minutes of being posted
- **SC-003**: An AI analysis failure for one tweet does not prevent other tweets in the same batch run from being processed
- **SC-004**: 100% of batch runs produce a log entry with processing counts and any errors

## Assumptions

- The AI model used is Claude (via Anthropic API), available at runtime via API key
- The analysis batch is a separate Lambda function from the fetch batch, triggered independently (also on a schedule or triggered after the fetch batch completes)
- The fetch batch already runs hourly and populates the UNPROCESSED queue (feature 005)
- Store metadata (name, address, area) is read from the stores table at analysis time for denormalization into OripaPost
- When a tweet mentions multiple events, only the most prominent one is extracted (one tweet → one OripaPost)
- The analysis batch processes up to 50 unprocessed tweets per run to control AI API costs
- `saleAt` for upcoming tweets without a specific date defaults to the next day in JST

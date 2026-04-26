# Research: CloudFront HTML Caching with Batch Invalidation

**Feature**: 016-cloudfront-cache  
**Date**: 2026-04-26

## Decision 1: How to pass CloudFront distribution ID from web-stack to batch-stack

**Decision**: CDK cross-stack reference via `distribution.distributionId` prop passed through `bin/app.ts`

**Rationale**: The distribution ID is known at CDK synth time as a CloudFormation export. Passing it as a CDK prop creates a clean CloudFormation Export/Import relationship. `bin/app.ts` constructs both stacks, so wiring them together there is straightforward: create `webStack` first, then pass `webStack.distribution.distributionId` to `BatchStack`. The Lambda receives the ID at deploy time via an environment variable.

**Alternatives considered**:
- SSM Parameter Store (web-stack writes ID, analyze Lambda reads at runtime): Adds latency and an extra AWS API call per batch run. Unnecessary when CDK cross-stack reference is clean.
- Hard-code distribution ID in `.env`: Brittle; breaks when stack is redeployed. Rejected.

## Decision 2: CloudFront CachePolicy settings for SSR pages

**Decision**: Custom `CachePolicy` with `defaultTtl=24h`, `minTtl=0`, `maxTtl=24h`, `queryStringBehavior=allowList(['area','page'])`, gzip+brotli compression enabled.

**Rationale**:
- `defaultTtl=24h` matches the daily batch cycle; content does not change intra-day.
- `minTtl=0` allows origin to override with `Cache-Control: no-store` if needed in the future.
- `maxTtl=24h` caps the TTL even if origin sends a longer `Cache-Control`.
- `allowList(['area','page'])` ensures each URL variant is cached independently without unbounded cache fragmentation from tracking parameters (e.g. `utm_source`).
- Cookies and headers excluded from cache key because all pages are fully server-rendered without user-session-dependent content.

**Alternatives considered**:
- `CACHING_OPTIMIZED` managed policy: Does not forward any query strings — would serve `/oripa` response for all `?area=X` variants. Rejected.
- `allowList` with all query strings: Would cause cache fragmentation with analytics parameters. Rejected.

## Decision 3: CreateInvalidation call placement in analyze.ts

**Decision**: Fire invalidation after the processing loop in the `handler` function, in a `finally`-style block: always attempt invalidation, catch and log errors, never throw.

**Rationale**:
- Spec requires FR-005: invalidation failure must not fail the batch.
- Running invalidation after the loop (not after each tweet) is correct — we want one invalidation per batch run, not N per tweet.
- `try/catch` wrapping the invalidation call ensures a CloudFront API error only produces a log entry.
- `CLOUDFRONT_DISTRIBUTION_ID` env var absence (e.g. local dev) short-circuits the call safely.

**Alternatives considered**:
- Fire invalidation only when `postsCreated > 0`: Spec FR-007 says invalidation fires even with zero posts. Rejected.
- EventBridge / SNS trigger: Overkill for a single daily job. Rejected.

## Decision 4: `@aws-sdk/client-cloudfront` dependency

**Decision**: Add `@aws-sdk/client-cloudfront` to `apps/batch/package.json` dependencies.

**Rationale**: The batch Lambda is bundled by esbuild (`aws-lambda-nodejs`), so the package must be declared in `package.json` for local type-checking and bundling. Version pinned to `^3.797.0` to align with existing `@aws-sdk/*` versions in the project.

**Alternatives considered**:
- Use AWS SDK v3 CloudFront client from Lambda runtime: Lambda Node.js 22.x runtime does not include AWS SDK v3. Must bundle. Confirmed.

# Data Model: CloudFront HTML Caching with Batch Invalidation

**Feature**: 016-cloudfront-cache  
**Date**: 2026-04-26

No DynamoDB schema changes. This feature is infrastructure-only.

## Entities

### CDN Cache Entry (CloudFront-managed)

Managed entirely by CloudFront. Not stored in DynamoDB.

| Field       | Type   | Description                                              |
|-------------|--------|----------------------------------------------------------|
| path        | string | URL path (e.g. `/oripa`, `/oripa/shops/abc`)             |
| area        | string | Query param cache key dimension (e.g. `akihabara`)       |
| page        | string | Query param cache key dimension (e.g. `2`)               |
| ttl         | number | Max 86400 seconds (24 hours)                             |
| cached_at   | time   | Set by CloudFront on first cache fill                    |

**Invalidation path pattern**: `/oripa*` — covers all paths starting with `/oripa`.

### AnalyzeRunResult (existing, extended)

The existing `AnalyzeRunResult` type in `analyze.ts` is unchanged. The invalidation is a side effect appended after the result is assembled; the result type does not need a new field.

```typescript
// Existing — no changes
export type AnalyzeRunResult = {
  runAt: string;
  tweetsProcessed: number;
  postsCreated: number;
  skipped: number;
  errors: Array<{ tweetId: string; error: string }>;
};
```

## Environment Variables (analyze Lambda)

| Variable                    | Source                          | Description                              |
|-----------------------------|---------------------------------|------------------------------------------|
| `CLOUDFRONT_DISTRIBUTION_ID`| CDK cross-stack ref (CfnExport) | CloudFront distribution ID for invalidation |

## IAM Permissions (analyze Lambda, new)

| Action                         | Resource                     |
|--------------------------------|------------------------------|
| `cloudfront:CreateInvalidation`| `arn:aws:cloudfront::<account>:distribution/<id>` |

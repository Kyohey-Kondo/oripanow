# Quickstart: CloudFront HTML Caching with Batch Invalidation

**Feature**: 016-cloudfront-cache  
**Date**: 2026-04-26

## Deploy

```bash
# Build the web app first (needed for CDK asset hash)
pnpm --filter @oripa-now/web build

# Install new dependency
pnpm install

# Deploy both stacks (web-stack first, batch-stack second — CDK handles order via dependency)
cd infra/cdk
pnpm cdk deploy --all
```

## Verify Cache is Working

After deploying, check that CloudFront caches HTML responses:

```bash
# First request — should be a cache MISS (origin hit)
curl -sI https://<your-domain>/oripa | grep -i "x-cache"
# Expected: X-Cache: Miss from cloudfront

# Second request — should be a cache HIT
curl -sI https://<your-domain>/oripa | grep -i "x-cache"
# Expected: X-Cache: Hit from cloudfront

# Different query params — separate cache entry
curl -sI "https://<your-domain>/oripa?area=akihabara" | grep -i "x-cache"
# Expected: X-Cache: Miss from cloudfront (new entry), then Hit on repeat
```

## Verify Invalidation

Trigger the analyze Lambda manually to test the invalidation:

```bash
aws lambda invoke \
  --function-name prod-oripa-now-analyze \
  --payload '{}' \
  /tmp/analyze-result.json

cat /tmp/analyze-result.json
```

Then check CloudFront invalidations in the AWS Console (CloudFront → Distribution → Invalidations tab) or via CLI:

```bash
aws cloudfront list-invalidations --distribution-id <DISTRIBUTION_ID>
```

After invalidation completes, the next request to `/oripa` should show `X-Cache: Miss from cloudfront` again.

## Verify Invalidation Failure is Non-Fatal

Remove `CLOUDFRONT_DISTRIBUTION_ID` from the Lambda env temporarily (via Console), invoke the function, and confirm:
- Lambda returns a result with no error
- CloudWatch logs show a warning about missing distribution ID
- Lambda is not marked as failed in EventBridge

Restore the env var after verification.

# Implementation Plan: CloudFront HTML Caching with Batch Invalidation

**Branch**: `016-cloudfront-cache` | **Date**: 2026-04-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-cloudfront-cache/spec.md`

## Summary

Add a 24-hour CloudFront cache for SSR HTML responses (`/oripa*`), keyed on `area` and `page` query parameters. After the daily analyze batch completes, automatically invalidate the CloudFront cache so visitors see fresh data. Static assets (`/_next/static/*`) are unaffected.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: AWS CDK v2 (`aws-cdk-lib`), `@aws-sdk/client-cloudfront` (new), `@aws-sdk/lib-dynamodb`  
**Storage**: N/A (infrastructure change only)  
**Testing**: Manual verification via CloudFront response headers (`X-Cache`)  
**Target Platform**: AWS (CloudFront + Lambda + CDK)  
**Project Type**: Infrastructure + batch Lambda  
**Performance Goals**: CDN cache hit rate >90% for repeated same-day requests  
**Constraints**: Invalidation must complete within 2 minutes of batch finish; invalidation failure must not fail the batch  
**Scale/Scope**: ~5 URL variants (`/oripa`, `/oripa?area=X`, `/oripa?page=N`, `/oripa/shops/*`)

## Constitution Check

Constitution is not yet project-specific (template placeholder). No gates apply.
All changes are additive: new CachePolicy, new env var, new IAM permission, new side-effect call in analyze.ts.

## Project Structure

### Documentation (this feature)

```text
specs/016-cloudfront-cache/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files changed)

```text
infra/cdk/
├── bin/app.ts                     # Reorder stacks; pass distributionId to BatchStack
├── lib/web-stack.ts               # Add CachePolicy (24h); export distribution as public
└── lib/batch-stack.ts             # Accept cloudFrontDistributionId prop; add env var + IAM

apps/batch/
├── package.json                   # Add @aws-sdk/client-cloudfront
└── src/analyze.ts                 # Call CreateInvalidation after processing completes
```

**Structure Decision**: Minimal change to existing monorepo structure. No new packages or directories required.

## Complexity Tracking

No constitution violations.

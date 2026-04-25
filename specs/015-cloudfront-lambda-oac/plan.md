# Implementation Plan: CloudFront to Lambda OAC

**Branch**: `015-cloudfront-lambda-oac` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/015-cloudfront-lambda-oac/spec.md`

## Summary

Restrict the Next.js SSR Lambda so it can only be invoked through CloudFront by:
1. Changing the Function URL auth type to `AWS_IAM`
2. Configuring CloudFront OAC to sign requests to the Lambda origin
3. Adding a Lambda resource-based policy that allows only this CloudFront distribution to call it

All changes are contained in a single CDK file: `infra/cdk/lib/web-stack.ts`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS  
**Primary Dependencies**: aws-cdk-lib v2.248.0, `aws-cdk-lib/aws-cloudfront-origins`  
**Storage**: N/A (infra-only change)  
**Testing**: Manual — Playwright screenshot + direct URL 403 check  
**Target Platform**: AWS (ap-northeast-1)  
**Project Type**: AWS CDK infrastructure stack  
**Performance Goals**: No regression in page load time  
**Constraints**: Single file change; no application code changes  
**Scale/Scope**: Affects all environments that deploy `WebStack`

## Constitution Check

This project has no active constitution (`constitution.md` contains placeholder template only). No gates to evaluate.

## Project Structure

### Documentation (this feature)

```text
specs/015-cloudfront-lambda-oac/
├── plan.md         ← this file
├── research.md     ← Phase 0 output
└── spec.md
```

### Source Code

```text
infra/cdk/lib/
└── web-stack.ts    ← only file changed
```

No new files. No changes to `apps/`, `packages/`, or `batch-stack.ts`.

## Implementation Steps

### Step 1 — Change Function URL authType

**File**: `infra/cdk/lib/web-stack.ts`

```diff
- const fnUrl = nextjsFn.addFunctionUrl({
-   authType: lambda.FunctionUrlAuthType.NONE,
- });
+ const fnUrl = nextjsFn.addFunctionUrl({
+   authType: lambda.FunctionUrlAuthType.AWS_IAM,
+ });
```

### Step 2 — Switch CloudFront default behavior to OAC origin

**File**: `infra/cdk/lib/web-stack.ts`

Replace the existing `FunctionUrlOrigin` with the OAC variant:

```diff
- origin: new origins.FunctionUrlOrigin(fnUrl),
+ origin: origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl),
```

CDK automatically creates an `OriginAccessControl` resource of type `lambda` and attaches it to this origin.

### Step 3 — Add Lambda resource-based policy

**File**: `infra/cdk/lib/web-stack.ts`

After the `distribution` is created, add:

```typescript
nextjsFn.addPermission('AllowCloudFrontInvoke', {
  principal: new iam.ServicePrincipal('cloudfront.amazonaws.com'),
  action: 'lambda:InvokeFunctionUrl',
  sourceArn: `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
});
```

This grants `lambda:InvokeFunctionUrl` exclusively to this distribution.

### Step 4 — Verify with CDK diff

```bash
cd infra/cdk
pnpm cdk diff
```

Expected diff output:
- `AWS::Lambda::Url` — `AuthType` changes from `NONE` to `AWS_IAM`
- `AWS::CloudFront::OriginAccessControl` — new resource (type `lambda`)
- `AWS::Lambda::Permission` — new resource for CloudFront principal
- `AWS::CloudFront::Distribution` — `OriginAccessControlId` added to default origin

### Step 5 — Deploy

```bash
pnpm cdk deploy WebStack
```

### Step 6 — Verify (Playwright + curl)

1. Open the CloudFront domain in a browser — pages must load normally.
2. Curl the raw Lambda Function URL directly:

```bash
curl -v https://<lambda-url-id>.lambda-url.ap-northeast-1.on.aws/
# Expected: HTTP 403 Forbidden
```

3. Take a Playwright screenshot of the top page and confirm layout is intact.

## Rollback Plan

If deployment causes issues:

1. Revert `authType` to `NONE`
2. Revert origin to `new origins.FunctionUrlOrigin(fnUrl)`
3. Remove `addPermission` call
4. `pnpm cdk deploy WebStack`

CloudFront distribution updates typically take 3–5 minutes to propagate globally.

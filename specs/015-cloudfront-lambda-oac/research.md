# Research: CloudFront to Lambda OAC

**Feature**: 015-cloudfront-lambda-oac
**Date**: 2026-04-25

---

## Decision 1: CDK API for Lambda Function URL OAC

**Decision**: Use `origins.FunctionUrlOrigin.withOriginAccessControl(fnUrl)` (aws-cdk-lib v2.248.0+)

**Rationale**: The static factory method `FunctionUrlOrigin.withOriginAccessControl` creates an OAC automatically and attaches it to the CloudFront origin. No need to instantiate `CfnOriginAccessControl` manually. Confirmed available in the project's installed version (v2.248.0).

**Alternatives considered**:
- `CfnOriginAccessControl` + manual OAC attachment — more verbose, lower-level, unnecessary given the high-level API exists.
- Lambda behind ALB with IAM auth — out of scope; changes the architecture entirely.

---

## Decision 2: Lambda Function URL authType

**Decision**: Change `authType` from `lambda.FunctionUrlAuthType.NONE` to `lambda.FunctionUrlAuthType.AWS_IAM`

**Rationale**: `AWS_IAM` makes the Function URL require a SigV4-signed request. CloudFront OAC performs this signing automatically. Unsigned requests (direct access) receive HTTP 403.

**Alternatives considered**:
- Keep `authType: NONE` and rely solely on WAF — does not prevent direct URL bypass.

---

## Decision 3: Lambda resource-based policy

**Decision**: Call `nextjsFn.addPermission(...)` after the `distribution` is created, using `distribution.distributionId` as the `sourceArn` condition.

**Rationale**: AWS requires a resource-based policy on the Lambda granting `lambda:InvokeFunctionUrl` to the `cloudfront.amazonaws.com` service principal, scoped to the specific distribution ARN. CDK resolves `distribution.distributionId` as a CloudFormation token, so there is no circular dependency at synthesis time.

**Key policy statement**:
```
Principal: cloudfront.amazonaws.com
Action:    lambda:InvokeFunctionUrl
Condition: ArnLike aws:SourceArn = arn:aws:cloudfront::<account>:distribution/<distributionId>
```

**Alternatives considered**:
- Scope permission to `*` (all CloudFront distributions) — weaker security; rejected.
- Use `CfnPermission` instead of `addPermission` — unnecessary when `addPermission` works.

---

## Decision 4: Circular dependency handling

**Decision**: No circular dependency exists when `addPermission` is called after `distribution` is constructed.

**Rationale**: CDK defers token resolution to CloudFormation synthesis. `distribution.distributionId` is a lazy token; `addPermission` just registers a policy with that token as an attribute. CDK's dependency graph handles the ordering during deployment.

---

## Decision 5: Impact on existing behaviors

**Decision**: Only the default behavior origin needs to change. The `/_next/static/*` behavior uses S3 with its own OAC and is unaffected.

**Rationale**: S3 OAC and Lambda URL OAC are configured independently per CloudFront behavior/origin. No changes needed to S3 origin or static asset serving.

---

## Summary of Changes

| File | Change |
|------|--------|
| `infra/cdk/lib/web-stack.ts` | `authType: AWS_IAM`, `withOriginAccessControl`, `addPermission` |

No changes to application code, DynamoDB, or other stacks.

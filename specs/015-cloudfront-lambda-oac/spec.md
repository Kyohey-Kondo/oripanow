# Feature Specification: CloudFront to Lambda OAC (Origin Access Control)

**Feature Branch**: `015-cloudfront-lambda-oac`
**Created**: 2026-04-25
**Status**: Draft
**Input**: User description: "OACを設定したい。cloudfrontからlambda"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Lambda URL Access Is Blocked (Priority: P1)

A malicious user discovers the Lambda Function URL and attempts to send requests directly, bypassing CloudFront and any WAF rules attached to it. With OAC in place, all direct requests to the Lambda URL are rejected with a 403 response.

**Why this priority**: This is the core security requirement. Without it, WAF rules on CloudFront are meaningless — attackers can route around them entirely.

**Independent Test**: Can be verified by calling the Lambda Function URL directly (outside of CloudFront) and confirming a 403 Forbidden response is returned.

**Acceptance Scenarios**:

1. **Given** the Lambda Function URL is known, **When** a request is sent directly to it without a valid CloudFront IAM signature, **Then** the response is HTTP 403 Forbidden.
2. **Given** a valid request passes through CloudFront, **When** CloudFront forwards it to the Lambda URL with an IAM-signed request, **Then** the response is HTTP 200 and the page renders normally.

---

### User Story 2 - Normal Website Browsing Continues to Work (Priority: P1)

An end user visits the website via the CloudFront domain. All pages (SSR and static assets) load correctly without any visible change in behavior.

**Why this priority**: Equally critical to P1 — the security change must not degrade the user experience.

**Independent Test**: Open the CloudFront domain in a browser and navigate through top page, area filter, and shop detail pages. All content loads successfully.

**Acceptance Scenarios**:

1. **Given** a user accesses the CloudFront domain, **When** they navigate to the top page, **Then** the page loads with oripa posts rendered server-side.
2. **Given** a user accesses a shop detail page, **When** the page loads, **Then** all server-rendered content and static assets are displayed correctly.
3. **Given** a user requests a static asset (`/_next/static/*`), **When** CloudFront serves from S3, **Then** the asset is returned normally (S3 origin is unaffected by this change).

---

### Edge Cases

- What happens if CloudFront's IAM role lacks permission to invoke the Lambda? The website becomes completely unavailable.
- What happens if a load balancer or monitoring tool sends health checks directly to the Lambda URL? Those checks will start returning 403 and must be updated to go through CloudFront.
- What happens during a CDK deployment when the Lambda code is updated? The Function URL endpoint changes — the new URL must remain restricted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Lambda Function URL MUST require IAM authentication (`authType: AWS_IAM`) so that only authorized callers can invoke it.
- **FR-002**: CloudFront MUST be configured with an Origin Access Control (OAC) that signs all requests to the Lambda Function URL using SigV4.
- **FR-003**: The Lambda resource-based policy MUST grant invocation permission only to the CloudFront distribution's service principal, scoped to this specific distribution.
- **FR-004**: Direct requests to the Lambda Function URL (without a valid CloudFront IAM signature) MUST be rejected with HTTP 403.
- **FR-005**: All existing CloudFront behaviors (default SSR behavior and `/_next/static/*` S3 behavior) MUST continue to function correctly after the change.
- **FR-006**: The CDK stack MUST programmatically configure the Lambda permission and OAC without manual console steps, so the configuration is reproducible across environments.

### Key Entities

- **Lambda Function URL**: The HTTPS endpoint for the Next.js SSR Lambda; changes from `authType: NONE` to `authType: AWS_IAM`.
- **CloudFront OAC**: An Origin Access Control resource attached to the CloudFront distribution that signs origin requests to the Lambda URL.
- **Lambda Resource Policy**: The permission statement on the Lambda function that authorizes CloudFront (and only CloudFront) to invoke it.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of requests sent directly to the Lambda Function URL (bypassing CloudFront) receive HTTP 403, with no exceptions.
- **SC-002**: 100% of legitimate page requests through the CloudFront domain succeed (HTTP 200) after the change is deployed.
- **SC-003**: Deployment is fully automated via CDK with zero manual steps required in the AWS console.
- **SC-004**: No increase in page load time for end users compared to the pre-OAC baseline (OAC signing overhead is transparent).

## Assumptions

- The CloudFront distribution and Lambda Function are both in scope for this change; the S3 static asset origin (already using OAC) is out of scope and unchanged.
- WAF will be addressed in a separate feature; this spec covers only the OAC/IAM access restriction.
- The CDK version in use (`aws-cdk-lib` v2) supports Lambda Function URL OAC natively or via `CfnOriginAccessControl`.
- Both staging and production environments will receive this change.
- No existing monitoring or health-check tools call the Lambda URL directly; if they do, they will need to be updated separately.

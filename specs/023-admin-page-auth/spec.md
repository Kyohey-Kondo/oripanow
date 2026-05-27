# Feature Specification: Admin Page with Hash Path and Basic Auth

**Feature Branch**: `023-admin-page-auth`  
**Created**: 2026-05-27  
**Status**: Draft  
**Input**: User description: "管理人用ページ（ハッシュパス + Basic認証による多層防御）"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Accesses Protected Page (Priority: P1)

The site administrator wants to view a protected management page. They navigate to the secret hash-prefixed URL and are prompted for credentials. After entering the correct username and password, they can access the admin content.

**Why this priority**: Core feature — without working authentication, the admin page cannot be used at all.

**Independent Test**: Can be fully tested by navigating to the secret URL, entering credentials, and verifying the admin page loads. Delivers the complete protected access flow.

**Acceptance Scenarios**:

1. **Given** the admin knows the secret hash path, **When** they navigate to `/<hash>/admin`, **Then** a Basic Auth credential dialog appears in the browser.
2. **Given** the credential dialog is shown, **When** the admin enters the correct username and password, **Then** they are granted access and the admin page content is displayed.
3. **Given** the credential dialog is shown, **When** the admin enters incorrect credentials, **Then** access is denied and the browser shows a 401 error or re-prompts for credentials.
4. **Given** a visitor does not know the hash path, **When** they try common admin paths such as `/admin`, `/dashboard`, **Then** they receive a 404 Not Found response.

---

### User Story 2 - Admin Page Displays Management Information (Priority: P2)

Once authenticated, the admin sees useful management data (e.g., recent posts, store list, operational stats) on the admin page.

**Why this priority**: The admin page must show meaningful content to be useful; however, the authentication layer (P1) must work first.

**Independent Test**: Can be tested independently by verifying the admin page renders correct content after authentication. Delivers value as an information dashboard.

**Acceptance Scenarios**:

1. **Given** the admin is authenticated, **When** they view the admin page, **Then** relevant management information is displayed (e.g., list of stores, recent posts count).
2. **Given** the admin is authenticated, **When** they refresh the page, **Then** they do not need to re-enter credentials within the same browser session.

---

### User Story 3 - Hash Path Rotation (Priority: P3)

The site operator can change the secret hash path without changing the application code, simply by updating a configuration value and redeploying.

**Why this priority**: Operational flexibility — useful if the hash path is ever leaked, but not required for the initial launch.

**Independent Test**: Can be tested by changing the hash path environment variable, redeploying, and confirming the old path returns 404 while the new path works.

**Acceptance Scenarios**:

1. **Given** the hash path is configured via an environment variable, **When** the variable is updated and the system is redeployed, **Then** the old path returns 404 and the new path requires Basic Auth credentials.

---

### Edge Cases

- What happens when the hash path is accessed without providing credentials? The browser should display a Basic Auth challenge.
- What happens when an unauthenticated user guesses a path that doesn't exist? They receive a 404, leaking no information about the admin path existence.
- What happens if the Basic Auth credentials environment variable is missing or malformed? The system should fail safely (deny all access) rather than granting open access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST protect the admin section behind a URL path that includes a short hash segment configured via an environment variable (e.g., `ADMIN_PATH_HASH`).
- **FR-002**: The system MUST require HTTP Basic Authentication credentials (username and password) when accessing any route under the admin path.
- **FR-003**: The admin credentials MUST be stored as environment variables (`ADMIN_USER`, `ADMIN_PASS`) and never hard-coded.
- **FR-004**: The system MUST return a 404 Not Found response for all requests to well-known admin paths (e.g., `/admin`, `/dashboard`, `/manager`) that do not match the configured hash path.
- **FR-005**: The system MUST return a 401 Unauthorized response when correct Basic Auth credentials are not provided for the hash path.
- **FR-006**: The admin page MUST display at least one category of management information useful to the site operator (e.g., store list, recent post count).
- **FR-007**: Access control MUST be enforced at the routing/middleware layer so that admin page content is never served before authentication is verified.

### Key Entities

- **Admin Session**: A browser session authenticated via Basic Auth. Credential is verified on every request (stateless); browsers cache it for the session duration.
- **Hash Path Segment**: A short opaque string (e.g., 6–8 hex characters) stored in an environment variable that forms the first segment of the admin URL path.
- **Admin Credentials**: Username/password pair stored in environment variables used to validate Basic Auth challenges.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An unauthenticated request to any path other than the configured hash path returns 404 within normal response time.
- **SC-002**: An unauthenticated request to the hash path returns a Basic Auth challenge (401 + `WWW-Authenticate` header) within normal response time.
- **SC-003**: An authenticated request to the hash path successfully loads the admin page with management content.
- **SC-004**: Changing the hash path environment variable and redeploying causes the old path to return 404 and the new path to require authentication — verifiable without code changes.
- **SC-005**: Zero lines of credential data appear in application source code or committed configuration files.

## Assumptions

- The site runs over HTTPS (via CloudFront), so Basic Auth credentials are encrypted in transit.
- A single administrator account is sufficient; multi-user access management is out of scope for v1.
- The hash path segment is generated and managed by the operator (not auto-generated by the system).
- The admin page is a read-only dashboard; write operations (e.g., editing stores) are out of scope for v1.
- The Next.js middleware layer (Edge Runtime) is the appropriate place to enforce both path obscurity and Basic Auth, consistent with the existing architecture.

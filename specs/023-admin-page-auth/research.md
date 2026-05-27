# Research: Admin Page with Hash Path and Basic Auth

## Decision 1: Auth Enforcement Layer

**Decision**: Next.js middleware (`middleware.ts`) at the web app root  
**Rationale**: Runs before any page rendering; no page code executes if auth fails. Works with both SSR pages and the App Router. Available in the existing stack with no additional dependencies.  
**Alternatives considered**:
- Page-level auth check (Server Component): Would still render the page and call DynamoDB before rejecting — unnecessary work and potential data exposure.
- Lambda authorizer at API Gateway: Not applicable here (CloudFront → Lambda URL architecture).

## Decision 2: Internal Route Naming

**Decision**: Fixed internal path `/admin-internal` (not `/admin`)  
**Rationale**: The hash path in the URL is `/<ADMIN_PATH_HASH>`, which middleware rewrites to `/admin-internal`. Using `/admin` as the internal path would conflict with the 404 protection for that well-known path.  
**Alternatives considered**:
- Dynamic segment `app/[adminHash]/page.tsx`: Would match all unknown top-level paths, breaking other routes.
- Named group `app/(admin)/page.tsx`: Route groups don't change the URL; still needs a concrete segment.

## Decision 3: Hash Path Environment Variable Strategy

**Decision**: Runtime env var `ADMIN_PATH_HASH` read in `middleware.ts` via `process.env`  
**Rationale**: Next.js middleware can read server-side env vars (non-`NEXT_PUBLIC_`) at runtime. The value is never exposed to the browser. Changing the hash requires only an env var update + redeploy, no code change.  
**Alternatives considered**:
- Build-time constant: Would require a full rebuild to rotate the path — less flexible.
- `NEXT_PUBLIC_` prefix: Would expose the hash to the client bundle — defeats the purpose.

## Decision 4: Basic Auth Implementation

**Decision**: Manual `Authorization` header parsing in middleware (no external library)  
**Rationale**: Basic Auth header parsing is ~10 lines of code. Adding a dependency for this would be overkill.  
**Alternatives considered**:
- `next-auth` / `iron-session`: Over-engineered for a single-user, single-page admin scenario.

## Decision 5: Admin Page Content (v1 Scope)

**Decision**: Display store count and last-7-day on-sale post counts per area using existing DynamoDB queries  
**Rationale**: Useful to the operator, reads from existing tables with no schema changes, fast to implement.  
**Alternatives considered**:
- Show raw DynamoDB items: Too noisy and not actionable.
- Build a full CRUD interface: Out of scope for v1 per spec.

# Implementation Plan: Admin Page with Hash Path and Basic Auth

**Branch**: `023-admin-page-auth` | **Date**: 2026-05-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/023-admin-page-auth/spec.md`

## Summary

Add a protected admin dashboard page to the existing Next.js web app. Access is guarded by two layers: an obscure URL path segment (configured via env var) that prevents bot scanning, and HTTP Basic Authentication for credential-based access control. Both layers are enforced in Next.js middleware (Edge Runtime). The admin page itself is an internal route that displays management information read from existing DynamoDB tables.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS + Next.js 15 (App Router)
**Primary Dependencies**: Next.js 15 middleware API (`NextResponse`, `NextRequest`), `@aws-sdk/lib-dynamodb`, `@oripa-now/db`
**Storage**: DynamoDB — reads from existing `stores` and `oripa-posts` tables (no schema changes)
**Testing**: `pnpm typecheck` (TypeScript strict), Playwright for E2E verification
**Target Platform**: AWS Lambda + CloudFront + Next.js (same as existing)
**Project Type**: Monorepo web service (admin page extension)
**Performance Goals**: Admin page load < 2s; auth check < 10ms
**Constraints**: Basic Auth credentials must never appear in source; hash path configurable at deploy time
**Scale/Scope**: Single administrator; read-only dashboard

## Constitution Check

*Constitution is a template (not ratified). No gates to enforce.*

No violations.

## Project Structure

### Documentation (this feature)

```text
specs/023-admin-page-auth/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md             ← created by /speckit.tasks
```

### Source Code (repository root)

```text
apps/web/
├── middleware.ts                       # NEW — hash path check + Basic Auth enforcement
├── app/
│   └── admin-internal/
│       ├── page.tsx                    # NEW — Server Component, admin dashboard content
│       └── admin-internal.module.css   # NEW — minimal layout styles
└── lib/
    └── admin.ts                        # NEW — fetchAdminStats() (store count, post counts)

infra/cdk/lib/
└── web-stack.ts                        # MODIFY — expose ADMIN_PATH_HASH, ADMIN_USER, ADMIN_PASS env vars to Lambda
```

**Structure Decision**: Middleware-centric approach — `middleware.ts` handles all auth logic; `/admin-internal` is the internal route accessible only via middleware rewrite. No new packages required.

## Architecture: Request Flow

```
Browser → CloudFront → Lambda (Next.js)
                              │
                         middleware.ts
                              │
          ┌───────────────────┼────────────────────────┐
          │                   │                        │
    path == /admin       path == /<HASH>          path == /admin-internal
    (or /dashboard)      (or /<HASH>/*)           (direct access)
          │                   │                        │
       404 Not Found    check Authorization         404 Not Found
                             header
                         ┌───┴───┐
                      valid?   invalid?
                         │        │
                    rewrite to  401 + WWW-Authenticate
                  /admin-internal
                         │
                  app/admin-internal/page.tsx
                  (Server Component, reads DynamoDB)
```

## Complexity Tracking

No constitution violations to justify.

# Quickstart: Admin Page with Hash Path and Basic Auth

## Local Development

1. Add env vars to `apps/web/.env.local`:

   ```
   ADMIN_PATH_HASH=dev123
   ADMIN_USER=admin
   ADMIN_PASS=password
   ```

2. Start the dev server:

   ```bash
   pnpm --filter @oripa-now/web dev
   ```

3. Visit `http://localhost:3000/dev123` — the browser will prompt for credentials.

4. Enter `admin` / `password` to access the admin dashboard.

5. Verify that `http://localhost:3000/admin` returns 404.

## Environment Variable Setup (Production)

Add the following to CDK (`infra/cdk/lib/web-stack.ts`) under the Next.js Lambda environment:

```
ADMIN_PATH_HASH   — set to a random 6–8 character hex string, e.g. openssl rand -hex 4
ADMIN_USER        — admin username
ADMIN_PASS        — admin password (store in AWS Secrets Manager or CDK context)
```

## Rotating the Hash Path

1. Generate a new hash: `openssl rand -hex 4`
2. Update `ADMIN_PATH_HASH` in CDK / Parameter Store
3. Redeploy — old path immediately returns 404, new path requires auth

## Playwright E2E Test

```bash
pnpm --filter @oripa-now/web test:e2e
```

Tests cover:
- `/dev123` → 401 without credentials
- `/dev123` with correct credentials → 200 with admin content
- `/admin` → 404
- `/admin-internal` → 404 (direct access blocked)

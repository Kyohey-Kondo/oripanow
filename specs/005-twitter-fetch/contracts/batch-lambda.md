# Contract: Batch Lambda — Twitter Fetch Handler

**Branch**: `005-twitter-fetch` | **Date**: 2026-04-13

## Trigger Contract

The Lambda function is invoked by an EventBridge scheduled rule. No custom event payload is required.

**Trigger**: EventBridge `rate(1 hour)` rule → Lambda `handler`
**Input event**: AWS scheduled event (no application-level payload consumed)

```json
{
  "source": "aws.events",
  "detail-type": "Scheduled Event",
  "detail": {}
}
```

The handler ignores the event payload entirely.

---

## Response Contract

The handler returns a structured summary object (used for CloudWatch Logs visibility, not consumed by any other service).

```typescript
type FetchRunResult = {
  runAt: string;          // ISO 8601 — when the run started
  storesProcessed: number;
  tweetsWritten: number;
  errors: Array<{
    storeId: string;
    twitterUsername: string;
    error: string;         // error message (never the full stack in prod)
  }>;
};
```

**On success** (even with per-store errors): returns `FetchRunResult`. The Lambda does NOT throw.
**On catastrophic failure** (e.g., cannot read stores table): throws, which EventBridge treats as a Lambda error (visible in CloudWatch metrics).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWITTER_BEARER_TOKEN` | Yes | Twitter API v2 App-only Bearer token |
| `DEPLOY_ENV` | Yes | Used to resolve table names via `TABLE_NAMES` from `@oripa-now/db` |
| `STORES_TABLE_NAME` | Yes | Injected by CDK; overrides default from schema |
| `TWEETS_TABLE_NAME` | Yes | Injected by CDK; overrides default from schema |
| `TWEET_KEYWORDS` | No | Comma-separated keyword list; defaults to `"オリパ,oripa"` |

---

## CDK Infrastructure Changes (BatchStack)

| Resource | Change |
|----------|--------|
| Lambda timeout | Increase from 30s → 5 minutes (handles ~50 stores serially) |
| EventBridge rule | **New**: `rate(1 hour)` rule targeting the batch Lambda |
| Lambda IAM policy | No change — already has read/write on all three tables |
| SSM / Secrets | `TWITTER_BEARER_TOKEN` stored in SSM Parameter Store as `SecureString`; CDK references it via `ssm.StringParameter.valueForSecureStringParameter` and injects as env var |

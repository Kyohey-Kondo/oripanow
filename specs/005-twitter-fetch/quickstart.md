# Quickstart: Twitter Data Fetch

**Branch**: `005-twitter-fetch` | **Date**: 2026-04-13

## Prerequisites

1. **Twitter API v2 credentials** — Apply for API access at developer.twitter.com. Copy the App-only Bearer token.
2. **AWS credentials** — `~/.aws/credentials` configured for the target environment.
3. **Node.js 22 + pnpm 9** — already required by the project.

---

## Local Development Setup

### 1. Store the Bearer token in SSM (one-time, per environment)

```bash
aws ssm put-parameter \
  --name "/oripa-now/dev/TWITTER_BEARER_TOKEN" \
  --type "SecureString" \
  --value "YOUR_BEARER_TOKEN_HERE"
```

### 2. Set environment variables for local testing

```bash
export TWITTER_BEARER_TOKEN="YOUR_BEARER_TOKEN_HERE"
export DEPLOY_ENV=dev
export STORES_TABLE_NAME=dev-stores
export TWEETS_TABLE_NAME=dev-tweets
```

### 3. Install the Twitter client package

```bash
pnpm --filter @oripa-now/batch add twitter-api-v2
```

### 4. Run the batch locally (invoke the handler directly)

```bash
pnpm --filter @oripa-now/batch build
# Then invoke via a small test script or ts-node:
npx ts-node -e "
  import { handler } from './apps/batch/src/index';
  handler({}).then(console.log);
"
```

---

## Deployment

### Deploy with CDK (includes the new EventBridge rule)

```bash
cd infra/cdk
pnpm run deploy -- --context deployEnv=dev
```

### Verify the schedule is active

```bash
aws events list-rules --name-prefix dev-oripa-now-batch-fetch
```

### Manually trigger the batch (without waiting for the schedule)

```bash
aws lambda invoke \
  --function-name dev-oripa-now-batch \
  --payload '{}' \
  /tmp/batch-output.json && cat /tmp/batch-output.json
```

---

## Verifying a Successful Run

1. Check CloudWatch Logs for the Lambda log group `/aws/lambda/dev-oripa-now-batch`
2. Look for a log entry with `tweetsWritten > 0` and `errors: []`
3. Confirm records appear in DynamoDB:

```bash
aws dynamodb scan \
  --table-name dev-tweets \
  --filter-expression "isProcessed = :false" \
  --expression-attribute-values '{":false": {"BOOL": false}}' \
  --query "Count"
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `errors: [{error: "401 Unauthorized"}]` | Bearer token missing or wrong | Check `TWITTER_BEARER_TOKEN` env var / SSM value |
| `errors: [{error: "429 Too Many Requests"}]` | Twitter rate limit hit | Reduce store count or add delay between stores |
| `tweetsWritten: 0` on first run | No matching tweets in last 7 days | Verify keyword list and store Twitter usernames in DynamoDB |
| Lambda timeout | Too many stores fetched serially | Increase timeout in CDK or reduce batch size |

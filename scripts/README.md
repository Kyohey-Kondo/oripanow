# scripts

One-shot operational scripts for managing the oripanow DynamoDB tables.
All commands are run from the **repo root**.

## Prerequisites

```bash
pnpm install
export AWS_REGION=ap-northeast-1
# AWS credentials must be configured (aws configure / SSO / env vars)
```

---

## discover-stores.ts — Discover store accounts from Twitter

Searches Twitter and outputs unique account usernames as a CSV for review.

```bash
# Token from SSM
AWS_REGION=ap-northeast-1 DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx discover-stores.ts

# Custom query or output path
QUERY="新宿 カードショップ -is:retweet" OUTPUT=data/store-shinjuku.csv AREA=tokyo \
  pnpm --filter @oripa-now/scripts exec tsx discover-stores.ts
```

| Env var | Default | Description |
|---------|---------|-------------|
| `QUERY` | `秋葉原 カードショップ -is:retweet` | Twitter search query |
| `MAX_RESULTS` | `100` | Max tweets to search |
| `OUTPUT` | `data/store-akihabara.csv` | Output CSV path |
| `AREA` | `tokyo` | Area value to fill in CSV |

Review the output CSV, then register with `add-store.ts`.

---

## add-store.ts — Register stores

### Single store

```bash
STORE_NAME="カードショップ秋葉原" \
TWITTER_USERNAME="akihabara_card" \
AREA="tokyo" \
ADDRESS="東京都千代田区外神田1-1-1" \
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx add-store.ts
```

### Bulk from CSV

```bash
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx add-store.ts data/additional-stores.csv
```

CSV format (`data/additional-stores.csv`):

```csv
name,twitterUsername,area,address
カードショップ秋葉原,akihabara_card,tokyo,東京都千代田区外神田1-1-1
ポケカ大宮店,pokeka_omiya,omiya,
```

| Column | Required | Description |
|--------|----------|-------------|
| `name` | ✓ | Store display name |
| `twitterUsername` | ✓ | Twitter handle (without @) |
| `area` | ✓ | `tokyo` or `omiya` |
| `address` | — | Physical address |

> CSV files under `data/` are gitignored.

---

## backfill.ts — Backfill tweets for all active stores

Cleans up dummy data, then fetches up to 7 days of real tweets from Twitter API.
Run this after registering stores for the first time.

```bash
# Token from SSM (recommended)
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx backfill.ts

# Token via env var
TWITTER_BEARER_TOKEN=<token> DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx backfill.ts
```

After backfill, invoke the analyze Lambda to process the fetched tweets:

```bash
aws lambda invoke \
  --function-name prod-oripa-now-analyze \
  --payload '{}' /tmp/out.json && cat /tmp/out.json
```

---

## reanalyze.ts — Full reset and re-analyze

Deletes all tweets and oripa-posts, re-fetches from Twitter, then re-runs AI analysis.
Use when the AI prompt or schema has changed and you need to reprocess everything.

```bash
# Full reset
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx reanalyze.ts

# Skip Twitter fetch (reuse existing tweets)
SKIP_FETCH=1 DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx reanalyze.ts
```

---

## Typical first-time setup flow

```bash
# 1. Register stores
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx add-store.ts data/additional-stores.csv

# 2. Backfill tweets (past 7 days)
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx backfill.ts

# 3. Analyze tweets (invoke Lambda)
aws lambda invoke --function-name prod-oripa-now-analyze --payload '{}' /tmp/out.json && cat /tmp/out.json
```

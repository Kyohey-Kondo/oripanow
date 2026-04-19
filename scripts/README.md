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

## backfill.ts — Backfill tweets for active stores

Fetches up to 7 days of real tweets from Twitter API and saves them as UNPROCESSED.

### Full mode (all stores — cleans up dummy data first)

```bash
# Token from SSM (recommended)
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx backfill.ts

# Token via env var
TWITTER_BEARER_TOKEN=<token> DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx backfill.ts
```

What full mode does:
1. Deletes dummy tweets (tweetId starting with `tw-`) and linked oripa-posts
2. Clears `lastFetchedTweetId` for all stores
3. Fetches tweets for all active stores

### CSV filter mode (new stores only — no cleanup, no reset)

Pass a CSV file (same format as `add-store.ts`) to backfill only the stores listed in it.
Use this after adding new stores so that existing store data is not affected.

```bash
DEPLOY_ENV=prod \
  pnpm --filter @oripa-now/scripts exec tsx backfill.ts data/additional-stores.csv
```

### After backfill

Invoke the analyze Lambda to process the fetched tweets:

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

## Typical flows

### First-time setup (all stores)

```bash
# 1. Register stores
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx add-store.ts data/additional-stores.csv

# 2. Backfill tweets (past 7 days, all stores)
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx backfill.ts

# 3. Analyze tweets (invoke Lambda)
aws lambda invoke --function-name prod-oripa-now-analyze --payload '{}' /tmp/out.json && cat /tmp/out.json
```

### Adding new stores to an existing environment

```bash
# 1. Register new stores from CSV
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx add-store.ts data/additional-stores.csv

# 2. Backfill tweets for new stores only (existing data untouched)
DEPLOY_ENV=prod pnpm --filter @oripa-now/scripts exec tsx backfill.ts data/additional-stores.csv

# 3. Analyze tweets (invoke Lambda)
aws lambda invoke --function-name prod-oripa-now-analyze --payload '{}' /tmp/out.json && cat /tmp/out.json
```

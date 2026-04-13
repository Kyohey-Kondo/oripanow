# Quickstart: Top Page — Stores with Same-Day Stock

**Feature**: 004-top-page-stores

## Prerequisites

- Node.js 22 LTS
- pnpm 9.x
- AWS credentials configured (for DynamoDB access)

## Run Unit Tests

```bash
# Install dependencies (first time)
pnpm install

# Run unit tests for the web app
pnpm --filter @oripa-now/web test

# Watch mode
pnpm --filter @oripa-now/web test -- --watch

# Coverage report
pnpm --filter @oripa-now/web test -- --coverage
```

Tests are in `apps/web/lib/__tests__/posts.test.ts` and cover:
- `sortNewestFirst` — correct descending order by createdAt
- `deduplicateByStore` — keeps only the newest post per storeId
- `capResults` — enforces 50-item limit
- `mapToSummary` — correct field mapping
- Integration of all steps — empty-state scenario (returns `[]`)

## Run the Dev Server

The dev server reads from DynamoDB. Set environment variables first:

```bash
# .env.local in apps/web/
DYNAMODB_TABLE_NAME=oripa-now-dev
AWS_REGION=ap-northeast-1
```

```bash
pnpm --filter @oripa-now/web dev
# Open http://localhost:3000
```

If no oripa posts exist for today in DynamoDB, the page shows the empty-state message.

## Seed Sample Data (DynamoDB)

To see the top page populated, insert a few `OripaPostItem` records into DynamoDB with:
- `saleAt` = today's date in JST (e.g., `2026-04-13`)
- `status` = `on_sale`
- `GSI1PK` = `tokyo#on_sale` or `omiya#on_sale`
- `GSI1SK` = `<saleAt>#<createdAt>` (e.g., `2026-04-13#2026-04-13T09:00:00.000Z`)

Example AWS CLI command:

```bash
aws dynamodb put-item \
  --table-name oripa-now-dev \
  --item '{
    "PK":        {"S": "POST#seed-001"},
    "SK":        {"S": "POST#seed-001"},
    "type":      {"S": "POST"},
    "id":        {"S": "seed-001"},
    "storeId":   {"S": "store-001"},
    "tweetId":   {"S": "tweet-001"},
    "status":    {"S": "on_sale"},
    "saleAt":    {"S": "2026-04-13"},
    "rawText":   {"S": "本日在庫あり"},
    "createdAt": {"S": "2026-04-13T09:00:00.000Z"},
    "updatedAt": {"S": "2026-04-13T09:00:00.000Z"},
    "storeName": {"S": "カードショップ秋葉原"},
    "GSI1PK":   {"S": "tokyo#on_sale"},
    "GSI1SK":   {"S": "2026-04-13#2026-04-13T09:00:00.000Z"},
    "GSI2PK":   {"S": "STORE#store-001"},
    "GSI2SK":   {"S": "CREATED#2026-04-13T09:00:00.000Z"}
  }' \
  --region ap-northeast-1
```

## Build & Deploy

```bash
# Full monorepo build
pnpm build

# Deploy (requires CDK bootstrap)
pnpm --filter @oripa-now/infra run deploy
```

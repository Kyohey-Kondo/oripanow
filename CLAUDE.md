# oripanow Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-05-07

## Active Technologies
- TypeScript 5.x / Node.js 22 LTS + pnpm 9.x, Turborepo, Next.js 15, AWS CDK v2, AWS SDK v3 (DynamoDB DocumentClient)
- DynamoDB（Single Table Design、GSI × 3、オンデマンドキャパシティ）
- Lambda Node.js 22.x（VPC なし・IAM 認証）
- TypeScript 5.x / Node.js 22 LTS / Lambda Node.js 22.x ランタイム + AWS CDK v2, `aws-cdk-lib/aws-lambda-nodejs`（esbuild）, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb` (002-infra-smoke-test)
- DynamoDB（Single Table `oripa-now`、GSI × 3、オンデマンドキャパシティ） (002-infra-smoke-test)
- TypeScript 5.x / Node.js 22 LTS / Lambda Node.js 22.x + Next.js 15 (App Router, `output: "standalone"`), `serverless-http`, `@types/serverless-http` (003-ssr-sample)
- なし（スタブデータはハードコード） (003-ssr-sample)
- `twitter-api-v2` (Twitter API v2 client), `ulid`, EventBridge hourly schedule (005-twitter-fetch)
- TypeScript 5.x / Node.js 22 LTS (Lambda `nodejs22.x`) + `@anthropic-ai/sdk` (Claude API), `@aws-sdk/lib-dynamodb`, `ulid` (006-ai-tweet-analysis)
- DynamoDB — `tweets` (read+update), `stores` (read), `oripa-posts` (write) (006-ai-tweet-analysis)
- TypeScript 5.x / Node.js 22 LTS + Next.js 15 (App Router, `force-dynamic`), `@aws-sdk/lib-dynamodb`, `@oripa-now/db`, `@oripa-now/types` (007-recent-posts-top-page)
- DynamoDB — `oripa-posts` table, GSI1 (`areaStatusDate` → `createdAt`) (007-recent-posts-top-page)
- DynamoDB via existing `queryRecentOnSalePostsByArea` (008-area-filter-top-page)
- DynamoDB — `oripa-posts` table via GSI2 (`storeId → createdAt`), `stores` table via GetItem (010-shop-detail-page)
- TypeScript 5.x / Node.js 22 LTS + Next.js 15 (App Router, `force-dynamic`, `searchParams`) (011-top-page-pagination)
- No DynamoDB changes — existing `getTodayOnSalePosts` extended to 60 items (011-top-page-pagination)
- DynamoDB — `stores` table (read only, no schema change) (014-shop-google-map)
- TypeScript 5.x / Node.js 22 LTS + AWS CDK v2 (`aws-cdk-lib`), `@aws-sdk/client-cloudfront` (new), `@aws-sdk/lib-dynamodb` (016-cloudfront-cache)
- N/A (infrastructure change only) (016-cloudfront-cache)
- TypeScript 5.x / Node.js 22 LTS + Next.js 15 (App Router, Server Components), CSS Modules (019-card-sort-filter)
- No changes — existing DynamoDB queries unchanged (019-card-sort-filter)

## Project Structure

```text
apps/web/        # Next.js 15 (App Router, SSR+ISR)
apps/batch/      # Lambda バッチ（ツイート取得・AI解析・DynamoDB保存）
packages/db/     # DynamoDB テーブル定義・Key ヘルパー・型（AWS SDK v3）
packages/types/  # 共有型定義
packages/config/ # TSConfig・ESLint 共通設定
infra/cdk/       # AWS CDK v2（batch-stack / web-stack）
```

## Commands

```bash
pnpm build      # turbo build（全ワークスペース）
pnpm typecheck  # turbo typecheck
pnpm lint       # turbo lint
pnpm --filter @oripa-now/web dev  # フロントエンド開発サーバー
```

## Code Style

TypeScript 5.x strict モード。`packages/config/tsconfig.base.json` を全ワークスペースが継承。

## DynamoDB Key Design

- Store:     PK=`STORE#<id>`       SK=`STORE#<id>`
- OripaPost: PK=`POST#<id>`        SK=`POST#<id>`
- Tweet:     PK=`STORE#<store_id>` SK=`TWEET#<tweetedAt>#<tweetId>`
- GSI1（エリア+ステータス）: GSI1PK=`<area>#<status>` GSI1SK=`<saleAtDate>#<createdAt>`
- GSI2（店舗別）:            GSI2PK=`STORE#<storeId>` GSI2SK=`CREATED#<createdAt>`
- GSI3（未処理 sparse）:     GSI3PK=`UNPROCESSED`     GSI3SK=`FETCHED#<fetchedAt>`

<!-- MANUAL ADDITIONS START -->
## Spec Writing Rules

- All content under `specs/` must be written in **English** (spec.md, plan.md, research.md, data-model.md, quickstart.md, tasks.md, contracts/, checklists/)

## UI Development Rules

- **Always verify UI changes with Playwright before deploying.** Take a screenshot and confirm the layout looks correct.

## Area Rules

- Valid areas: `akihabara`, `ikebukuro`, `shinjuku`, `kawagoe`, `omiya`
- Tab display order: **東京エリア先（秋葉原→池袋→新宿）、埼玉エリア後（川越→大宮）**
- New areas must be added to: `packages/db/schema/index.ts` (type), `apps/web/lib/posts.ts` (AREAS array), `apps/web/app/oripa/page.tsx` (AREA_LABELS_MAP, in correct order), `apps/web/app/oripa/components/OripaCard.tsx` (AREA_LABELS), `apps/web/app/oripa/shops/[storeId]/page.tsx` (AREA_LABELS), `scripts/add-store.ts` (validateArea)
<!-- MANUAL ADDITIONS END -->

## Recent Changes
- 019-card-sort-filter: Added TypeScript 5.x / Node.js 22 LTS + Next.js 15 (App Router, Server Components), CSS Modules
- 017-card-ui-redesign: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]
- 016-cloudfront-cache: Added TypeScript 5.x / Node.js 22 LTS + AWS CDK v2 (`aws-cdk-lib`), `@aws-sdk/client-cloudfront` (new), `@aws-sdk/lib-dynamodb`

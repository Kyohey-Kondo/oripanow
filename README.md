# oripa-now

ポケカ専門店舗のオリパ発売情報を自動収集・集約する Web サービス。

## ディレクトリ構成

| ディレクトリ | パッケージ名 | 説明 |
|---|---|---|
| `apps/web` | `@oripa-now/web` | Next.js フロントエンド（ユーザー向け Web UI） |
| `apps/batch` | `@oripa-now/batch` | Lambda バッチ処理（ツイート取得・AI 解析） |
| `packages/db` | `@oripa-now/db` | DynamoDB テーブル定義・クライアント（AWS SDK v3） |
| `packages/types` | `@oripa-now/types` | アプリ間共有型定義 |
| `packages/config` | `@oripa-now/config` | ESLint・TSConfig 共通設定 |
| `infra/cdk` | `@oripa-now/infra` | AWS CDK インフラ定義 |

## セットアップ

```bash
# Node.js バージョン設定（.nvmrc 参照）
nvm use

# 依存インストール
pnpm install

# 全ワークスペースのビルド
pnpm build

# 型チェック
pnpm typecheck

# Lint
pnpm lint
```

## ワークスペース別コマンド

```bash
# フロントエンド開発サーバー起動
pnpm --filter @oripa-now/web dev

# バッチビルド
pnpm --filter @oripa-now/batch build
```

## 環境変数

環境変数ファイルはすべて `.gitignore` 対象です。初回セットアップ時に example からコピーして値を設定してください。

### フロントエンド (`apps/web`)

```bash
cp apps/web/.env.local.example apps/web/.env.local
```

| 変数 | 説明 |
|---|---|
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 測定 ID（例: `G-XXXXXXXXXX`） |

> `NEXT_PUBLIC_GA_ID` はビルド時に JS バンドルへ埋め込まれます。`NODE_ENV=production`（`next build`）のときのみ有効なため、ローカル開発中は GA にデータが送信されません。

### CDK (`infra/cdk`)

```bash
cp infra/cdk/.env.example infra/cdk/.env
```

| 変数 | 説明 |
|---|---|
| `DEPLOY_ENV` | デプロイ環境プレフィックス（例: `dev`） |
| `DOMAIN_NAME` | CloudFront カスタムドメイン（例: `oripanow.app`） |
| `CERTIFICATE_ARN` | カスタムドメイン用 ACM 証明書 ARN（`us-east-1` のもの） |

> `infra/cdk/.env` が未設定のままデプロイすると、CloudFront からカスタムドメイン・証明書の設定が消えるので必ず設定してください。

## デプロイ手順

### 1. ビルド

```bash
# Next.js 本番ビルド（standalone 出力）
pnpm --filter @oripa-now/web build
```

### 2. CDK デプロイ

```bash
# 特定スタックのみ（infra/cdk/.env の設定が必要）
cd infra/cdk
pnpm run deploy dev-batch-stack
pnpm run deploy dev-web-stack
```

デプロイ完了後、CloudFront の URL が出力されます：

```
Outputs:
dev-web-stack.DistributionDomain = xxxx.cloudfront.net
dev-batch-stack.DynamoDBTableName = dev-oripa-now
```

### 3. シードデータ投入

DynamoDB 3テーブル（stores / oripa-posts / tweets）に今日付けのサンプルデータを投入します：

```bash
DEPLOY_ENV=dev pnpm --filter @oripa-now/db run seed
```

Store × 4、OripaPost × 9（当日 on_sale × 5、sold_out × 2、昨日 × 2）、Tweet × 5 が投入されます。

### 4. 動作確認

- ブラウザで `https://<DistributionDomain>` を開く
- 店舗一覧が新着順に表示されることを確認

### 5. リソース削除

作業終了後はコストが発生しないよう AWS リソースを削除してください：

```bash
aws cloudformation delete-stack --stack-name dev-web-stack
aws cloudformation delete-stack --stack-name dev-batch-stack

# 削除完了を待機
aws cloudformation wait stack-delete-complete --stack-name dev-web-stack
aws cloudformation wait stack-delete-complete --stack-name dev-batch-stack
```

> **注意**: CDKToolkit（ブートストラップスタック）は削除不要です。次回デプロイ時に再利用されます。

---

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **バッチ**: Node.js (AWS Lambda)
- **データベース**: DynamoDB（Single Table Design、AWS SDK v3）
- **インフラ**: AWS CDK v2
- **パッケージ管理**: pnpm workspaces + Turborepo

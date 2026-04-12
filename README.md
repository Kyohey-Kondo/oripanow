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

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router)
- **バッチ**: Node.js (AWS Lambda)
- **データベース**: DynamoDB（Single Table Design、AWS SDK v3）
- **インフラ**: AWS CDK v2
- **パッケージ管理**: pnpm workspaces + Turborepo

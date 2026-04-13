# Quickstart: Project Directory Setup

## 前提条件

- Node.js 22 LTS（`.nvmrc` 参照）
- pnpm 9.x 以上 (`npm install -g pnpm`)

## セットアップ手順

```bash
# 1. リポジトリクローン後
nvm use          # .nvmrc の Node.js バージョンを使用

# 2. 依存インストール
pnpm install

# 3. 全ワークスペースのビルド確認
pnpm build

# 4. 型チェック
pnpm typecheck

# 5. Lint
pnpm lint
```

## ワークスペース別コマンド

```bash
# フロントエンドのみ起動
pnpm --filter @oripa-now/web dev

# バッチのみビルド
pnpm --filter @oripa-now/batch build

# DB スキーマ確認
pnpm --filter @oripa-now/db generate
```

## ディレクトリ説明

| ディレクトリ | 説明 |
|---|---|
| `apps/web` | Next.js フロントエンド（ユーザー向け Web UI） |
| `apps/batch` | Lambda バッチ（ツイート取得・AI 解析） |
| `packages/db` | Drizzle ORM スキーマ・マイグレーション |
| `packages/types` | アプリ間共有型定義 |
| `packages/config` | ESLint・TSConfig 共通設定 |
| `infra/cdk` | AWS CDK インフラ定義 |

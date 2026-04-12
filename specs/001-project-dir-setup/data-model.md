# Data Model: Project Directory Setup

**Feature**: 001-project-dir-setup
**Date**: 2026-04-12

> このフィーチャーはデータベーススキーマを持たない（ディレクトリ骨格のみ）。
> ここではワークスペース間の依存関係モデルを定義する。

## Workspace Dependency Graph

```
apps/web
  └── depends on: packages/types, packages/config
  ※ DBには直接接続しない。API エンドポイント URL を環境変数で受け取る

apps/batch
  └── depends on: packages/db, packages/types, packages/config

packages/db
  └── depends on: packages/types, packages/config

packages/types
  └── depends on: (none)

packages/config
  └── depends on: (none)

infra/cdk
  └── depends on: packages/types
```

## Workspace 定義

| パッケージ名 | パス | 役割 |
|---|---|---|
| `@oripa-now/web` | `apps/web` | Next.js フロントエンド |
| `@oripa-now/batch` | `apps/batch` | Lambda バッチ処理 |
| `@oripa-now/db` | `packages/db` | Drizzle ORM スキーマ・マイグレーション |
| `@oripa-now/types` | `packages/types` | 共有型定義 |
| `@oripa-now/config` | `packages/config` | ESLint・TSConfig 共通設定 |
| `@oripa-now/infra` | `infra/cdk` | AWS CDK インフラ定義 |

## ディレクトリ構造（最終形）

```
oripa-now/
├── apps/
│   ├── web/
│   │   ├── app/                    # Next.js App Router
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .eslintrc.js
│   └── batch/
│       ├── src/
│       │   ├── index.ts            # Lambda ハンドラー（スタブ）
│       │   ├── fetch.ts            # スタブ
│       │   ├── parse.ts            # スタブ
│       │   └── save.ts             # スタブ
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── db/
│   │   ├── schema/
│   │   │   └── index.ts            # スタブ
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── types/
│   │   ├── src/
│   │   │   └── index.ts            # スタブ
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/
│       ├── tsconfig.base.json
│       ├── tsconfig.nextjs.json
│       ├── eslint-base.js
│       └── package.json
│
├── infra/
│   └── cdk/
│       ├── bin/
│       │   └── app.ts              # CDK エントリーポイント（スタブ）
│       ├── lib/
│       │   ├── web-stack.ts        # CloudFront + Lambda (Next.js)
│       │   └── batch-stack.ts      # EventBridge + Lambda + Aurora Serverless v2
│       ├── cdk.json
│       ├── tsconfig.json
│       └── package.json
│
├── package.json                    # pnpm workspaces ルート
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json              # （packages/config を参照するシンボリックまたはコピー）
├── .nvmrc
├── .gitignore
└── README.md
```

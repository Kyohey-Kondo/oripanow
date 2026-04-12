# Implementation Plan: Project Directory Setup

**Branch**: `001-project-dir-setup` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)

## Summary

pnpm workspaces + Turborepo を使ったモノリポ構成のディレクトリ骨格と設定ファイルを作成する。
`apps/web`・`apps/batch`・`packages/db`・`packages/types`・`packages/config`・`infra/cdk` の6ワークスペースを整備し、各アプリの実装コード（ページ・ハンドラー等）はスタブのみ配置する。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS
**Primary Dependencies**: pnpm 9.x, Turborepo, Next.js 15, AWS CDK v2, Drizzle ORM
**Storage**: N/A（このフィーチャーではスキーマスタブのみ）
**Testing**: N/A（このフィーチャーでは設定ファイルのみ）
**Target Platform**: macOS / Linux（開発環境）; AWS Lambda + CloudFront（本番は別フィーチャー）
**Project Type**: モノリポ（web-service + batch + iac）
**Performance Goals**: `pnpm build` が 5 分以内に完了
**Constraints**: 各ワークスペースは独立してビルド・型チェック可能
**Scale/Scope**: 6 ワークスペース、スタブ実装のみ

## Constitution Check

constitution.md がまだテンプレート状態のため、チェック対象の原則なし。通過。

## Project Structure

### Documentation (this feature)

```text
specs/001-project-dir-setup/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks で生成)
```

### Source Code (repository root)

```text
oripa-now/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tsconfig.json
│   │   ├── package.json
│   │   └── .eslintrc.js
│   └── batch/
│       ├── src/
│       │   ├── index.ts
│       │   ├── fetch.ts
│       │   ├── parse.ts
│       │   └── save.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── db/
│   │   ├── schema/index.ts
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── types/
│   │   ├── src/index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── config/
│       ├── tsconfig.base.json
│       ├── tsconfig.nextjs.json
│       ├── eslint-base.js
│       └── package.json
├── infra/
│   └── cdk/
│       ├── bin/app.ts
│       ├── lib/
│       │   ├── web-stack.ts    # CloudFront + Lambda (Next.js)
│       │   └── batch-stack.ts  # EventBridge + Lambda + Aurora Serverless v2
│       ├── cdk.json
│       ├── tsconfig.json
│       └── package.json
├── package.json          # pnpm workspaces ルート
├── pnpm-workspace.yaml
├── turbo.json
├── .nvmrc
├── .gitignore
└── README.md
```

**Structure Decision**: Option 3 相当（web-service + batch + iac の複合モノリポ）。`apps/` にアプリ、`packages/` に共有ライブラリ、`infra/` に IaC を配置する要件定義ドラフト Section 6.3 の構成を採用。

## Complexity Tracking

Constitution Check 違反なし。記入不要。

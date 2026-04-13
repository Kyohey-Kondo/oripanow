# Implementation Plan: SSR Sample Page

**Branch**: `003-ssr-sample` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)

## Summary

Next.js 15 App Router の Server Component で stub データ（オリパ発売情報 3〜5 件）をサーバーサイドでレンダリングし、既存の CloudFront + Lambda Function URL 構成で HTML を返す最小サンプル。`output: "standalone"` + `serverless-http` により Lambda で Next.js を動かし、curl で HTML ソースにデータが含まれることを確認する。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS / Lambda Node.js 22.x
**Primary Dependencies**: Next.js 15 (App Router, `output: "standalone"`), `serverless-http`, `@types/serverless-http`
**Storage**: なし（スタブデータはハードコード）
**Testing**: `curl` による手動確認（HTML ソース検証）
**Target Platform**: AWS ap-northeast-1 / Lambda Function URL → CloudFront
**Project Type**: SSR Web Application（Lambda ランタイム）
**Performance Goals**: ページ応答 5 秒以内（コールドスタート含む）
**Constraints**: Lambda タイムアウト 30 秒、Next.js standalone を Lambda にパッケージ
**Scale/Scope**: 1 ページ（トップページ）、スタブデータ 3〜5 件

## Constitution Check

constitution.md がテンプレート状態のためチェック対象の原則なし。通過。

## Project Structure

### Documentation (this feature)

```text
specs/003-ssr-sample/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── ssr-page.md
└── tasks.md             # /speckit.tasks で生成
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   └── page.tsx               # Next.js Server Component（SSR ページ）
├── src/
│   ├── lambda.ts              # Lambda ハンドラー（serverless-http + Next.js）
│   └── stubs/
│       └── oripa-posts.ts     # スタブデータ（OripaPost[]）
└── next.config.ts             # output: "standalone" を追加

infra/cdk/lib/
└── web-stack.ts               # NodejsFunction → Code.fromAsset に変更
```

**Structure Decision**: 既存 `apps/web` の App Router 構成を踏襲。Lambda エントリは `apps/web/src/lambda.ts` に新設。スタブデータは `apps/web/src/stubs/` に配置し Server Component から直接 import。

### ビルドフロー

```
pnpm --filter @oripa-now/web build
  → next build (standalone モード)
  → .next/standalone/ 生成
  → postbuild スクリプトで lambda ハンドラーを standalone にコピー

DEPLOY_ENV=dev pnpm --filter @oripa-now/infra run deploy -- dev-web-stack
  → CDK が .next/standalone/ を Code.fromAsset でパッケージ
  → Lambda にデプロイ
```

### 変更される AWS リソース

| リソース | 変更内容 |
|---|---|
| Lambda `dev-oripa-now-nextjs` | コード変更（inline stub → Next.js standalone） |
| CloudFront Distribution | 変更なし |
| Lambda Function URL | 変更なし |

## Complexity Tracking

Constitution Check 違反なし。記入不要。

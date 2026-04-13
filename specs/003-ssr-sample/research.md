# Research: SSR Sample Page

**Feature**: 003-ssr-sample
**Date**: 2026-04-12

## Decision 1: Next.js Lambda デプロイ方式

**Decision**: `output: "standalone"` + `serverless-http` ラッパー

**Rationale**:
- Next.js 15 の `standalone` モードはビルド時に `node_modules` を含む自己完結型の出力（`.next/standalone/`）を生成する
- `serverless-http` が Node.js HTTP サーバーを Lambda イベント/レスポンス形式に変換する
- OpenNext より設定が少なく、最小サンプルとして適切
- 既存の CDK `web-stack.ts` の Lambda Function URL → CloudFront 構成をそのまま再利用できる

**Alternatives considered**:
- **OpenNext** (`@opennextjs/aws`): 本番向けには優れるが、複数 Lambda・S3 アセット配信など CDK 構成の大幅変更が必要。最小サンプルには過剰
- **カスタム HTML レンダラー Lambda**: Next.js を使わず TypeScript で HTML を生成。SSR の概念証明にはなるが Next.js の SSR パターン習得にならない
- **Lambda Layer**: standalone を Layer に置く方法もあるが、サイズ制限（250MB）のリスクあり

---

## Decision 2: stub データの実装場所

**Decision**: `apps/web/src/stubs/oripa-posts.ts` にハードコードされたモジュールとして実装し、Server Component から直接 import する

**Rationale**:
- Next.js Server Component から同一サーバーの Route Handler を HTTP で呼び出すのは Lambda 環境では自己参照になり不要な複雑さを生む
- stub データは純粋な TypeScript モジュール（関数）として実装し、サーバーサイドで直接 import するのが最もシンプル
- 本番実装への移行時は import 元を DynamoDB クエリに差し替えるだけでよい

**Alternatives considered**:
- **Route Handler** (`/api/oripa-posts`): フロントエンドとバックエンドの分離を示せるが、Lambda 環境での loopback リクエストは避けたい
- **`apps/batch` Lambda 呼び出し**: AWS SDK で Lambda を直接呼び出す方法。インフラ依存が増え最小サンプルとして過剰

---

## Decision 3: ビルド・デプロイフロー

**Decision**: `next build`（standalone 出力）→ Lambda ハンドラーを standalone ディレクトリにコピー → CDK `Code.fromAsset`

**Rationale**:
- Next.js の `standalone` 出力は `.next/standalone/` に完全なサーバー実行ファイルを生成する
- Lambda ハンドラー (`apps/web/src/lambda.ts`) をビルドし、`standalone` ディレクトリに配置することで CDK が `Code.fromAsset` でまとめてパッケージできる
- `package.json` の `postbuild` スクリプトで自動化する

**Build order**:
```
1. pnpm --filter @oripa-now/web build   # next build → .next/standalone/
2. pnpm --filter @oripa-now/infra run deploy  # CDK が .next/standalone/ を Lambda アセットとして使用
```

---

## Decision 4: Lambda ハンドラー実装

**Decision**: `apps/web/src/lambda.ts` に `serverless-http` + Next.js standalone サーバーのラッパーを実装

```typescript
// 概要
import serverlessHttp from 'serverless-http';
import { createServer } from 'http';
import next from 'next';

const app = next({ dir: __dirname, dev: false });
const handle = app.getRequestHandler();
const server = createServer((req, res) => handle(req, res));

let initialized = false;
const serverlessHandler = serverlessHttp(server);

export const handler = async (event, context) => {
  if (!initialized) {
    await app.prepare();
    initialized = true;
  }
  return serverlessHandler(event, context);
};
```

**Warm start 最適化**: `initialized` フラグにより `app.prepare()` はコールドスタート時のみ実行される

---

## Decision 5: CDK web-stack の変更

**Decision**: `lambda.Code.fromInline` → `lambda.Code.fromAsset('.next/standalone')` に変更

**注意点**:
- Lambda ハンドラー名: `lambda.handler`（`apps/web/src/lambda.ts` の `handler` export）
- `NodejsFunction` ではなく `lambda.Function` + `Code.fromAsset` を使用（standalone は事前ビルド済みのため esbuild バンドル不要）
- standalone 出力に `server_handler` (lambda.js) をコピーする postbuild スクリプトが必要

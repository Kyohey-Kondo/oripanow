# Implementation Plan: Infrastructure Smoke Test

**Branch**: `002-infra-smoke-test` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)

## Summary

CDK で DynamoDB テーブル・Lambda を含む `batch-stack` と `web-stack` をデプロイし、Lambda ヘルスチェック（`{"status":"healthy"}`）と DynamoDB 接続確認（`{"db":"connected"}`）が通ることを確認する。VPC・NAT・Secrets Manager は不要で、IAM ロールで Lambda に DynamoDB アクセス権を付与するシンプルな構成。

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 LTS / Lambda Node.js 22.x ランタイム
**Primary Dependencies**: AWS CDK v2, `aws-cdk-lib/aws-lambda-nodejs`（esbuild）, `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`
**Storage**: DynamoDB（Single Table `oripa-now`、GSI × 3、オンデマンドキャパシティ）
**Testing**: `aws lambda invoke` による手動 smoke test
**Target Platform**: AWS ap-northeast-1
**Project Type**: IaC（CDK）+ Lambda（TypeScript）
**Performance Goals**: Lambda 応答 30 秒以内（コールドスタート含む）
**Constraints**: Lambda は VPC なし（DynamoDB は AWS API エンドポイント経由で接続）
**Scale/Scope**: 2 スタック（batch-stack / web-stack）、Lambda 1 関数

## Constitution Check

constitution.md がテンプレート状態のためチェック対象の原則なし。通過。

## Project Structure

### Documentation (this feature)

```text
specs/002-infra-smoke-test/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── lambda-health-check.md
└── tasks.md             # /speckit.tasks で生成
```

### Source Code (repository root)

```text
infra/cdk/
├── bin/
│   └── app.ts                 # CDK エントリーポイント（全スタック登録）
└── lib/
    ├── batch-stack.ts         # DynamoDB + Lambda + EventBridge(スタブ)
    └── web-stack.ts           # CloudFront + S3 + Lambda(Next.js スタブ)

apps/batch/
└── src/
    └── index.ts               # Lambda ハンドラー（ヘルスチェック + DynamoDB 接続確認）
```

**Structure Decision**: IaC + Lambda の複合構成。CDK スタックは `infra/cdk/lib/` に、Lambda ハンドラーは `apps/batch/src/` に配置する既存モノリポ構成を踏襲。

### 作成される AWS リソース

#### batch-stack（5 リソース）

| リソース種別 | 用途 |
|---|---|
| DynamoDB Table | `oripa-now`、PK+SK、GSI × 3、オンデマンド |
| IAM Role | Lambda 実行ロール |
| IAM Policy | DynamoDB 操作権限（GetItem・PutItem・Query・UpdateItem） |
| Lambda Function | ヘルスチェック + DynamoDB 接続確認、Node.js 22.x |
| CloudWatch Log Group | Lambda ログ |

#### web-stack（5 リソース）

| リソース種別 | 用途 |
|---|---|
| IAM Role | Lambda (Next.js) 実行ロール |
| Lambda Function | Next.js SSR（スタブ） |
| CloudFront Distribution | CDN + HTTPS |
| S3 Bucket | 静的アセット |
| CloudWatch Log Group | Lambda ログ |

## Complexity Tracking

Constitution Check 違反なし。記入不要。

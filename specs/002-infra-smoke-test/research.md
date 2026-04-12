# Research: Infrastructure Smoke Test

**Feature**: 002-infra-smoke-test
**Date**: 2026-04-12

## Decision Log

### データベース

- **Decision**: DynamoDB（VPC 不要・IAM 認証ネイティブ）
- **Rationale**: Lambda から VPC なしで接続可能。NAT Gateway・Secrets Manager 不要でインフラが大幅に簡素化される。アプリのアクセスパターンは固定的で GSI 3 本でカバーできる。
- **Alternatives considered**: Aurora Serverless v2（VPC 必須・NAT または VPC Endpoint が必要・高コスト）

### Lambda の VPC 配置

- **Decision**: VPC なし（Lambda はデフォルトの AWS マネージドネットワークで動作）
- **Rationale**: DynamoDB は AWS API エンドポイント経由で接続するため VPC 不要。VPC なし Lambda はコールドスタートが速く、Twitter API・Claude API へのアウトバウンドも追加設定不要。
- **Alternatives considered**: VPC 内配置（DynamoDB VPC Endpoint が必要で複雑さが増す）

### DB 認証

- **Decision**: IAM 認証（Lambda 実行ロールに DynamoDB 操作権限を付与）
- **Rationale**: パスワード不要・Secrets Manager 不要。CDK で IAM ロールとポリシーを定義するだけで完結。最小権限の原則を適用しやすい。
- **Alternatives considered**: なし（DynamoDB は IAM 認証が標準）

### Lambda ランタイム・バンドル

- **Decision**: Node.js 22.x、`NodejsFunction` construct（esbuild 内蔵）
- **Rationale**: プロジェクト全体で Node.js 22 を使用。CDK の `NodejsFunction` が TypeScript ソースを直接指定できるため別途ビルドステップ不要。
- **Alternatives considered**: Node.js 20.x（サポート期限が近い）

### デプロイ前リソース確認方法

- **Decision**: `cdk synth` + `cdk diff`
- **Rationale**: CDK 標準機能。`cdk synth` で CloudFormation テンプレートを生成してリソース確認、`cdk diff` で現環境との差分を確認する。
- **Alternatives considered**: なし（CDK 標準の方法が最適）

### 作成される AWS リソース（cdk synth の予測）

#### batch-stack

| リソース種別 | 用途 |
|---|---|
| DynamoDB Table | Single Table（oripa-now）、GSI × 3 |
| IAM Role | Lambda 実行ロール |
| IAM Policy | DynamoDB 操作権限（GetItem・PutItem・Query 等） |
| Lambda Function | ヘルスチェック + DynamoDB 接続確認 |
| CloudWatch Log Group | Lambda ログ |

#### web-stack

| リソース種別 | 用途 |
|---|---|
| IAM Role | Lambda (Next.js) 実行ロール |
| Lambda Function | Next.js SSR（スタブ） |
| CloudFront Distribution | CDN + HTTPS |
| S3 Bucket | 静的アセット |
| CloudWatch Log Group | Lambda ログ |

## 未解決事項

なし

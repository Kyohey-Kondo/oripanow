# Data Model: Infrastructure Smoke Test

**Feature**: 002-infra-smoke-test
**Date**: 2026-04-12

> このフィーチャーはアプリケーションデータモデルを持たない。
> ここでは CDK スタック構成と Lambda レスポンス構造を定義する。

## CDK スタック構成

```
batch-stack
  ├── DynamoDB Table（oripa-now）
  │   ├── Primary Key: PK (String) + SK (String)
  │   ├── GSI1: GSI1PK + GSI1SK（エリア別・ステータス別）
  │   ├── GSI2: GSI2PK + GSI2SK（店舗別）
  │   └── GSI3: GSI3PK + GSI3SK（未処理ツイート、sparse）
  ├── IAM Role（Lambda 実行ロール）
  │   └── Policy: DynamoDB GetItem / PutItem / Query / UpdateItem（テーブル + GSI）
  ├── Lambda Function（ヘルスチェック）
  │   ├── Runtime: Node.js 22.x
  │   ├── Handler: apps/batch/src/index.handler
  │   └── Env: DYNAMODB_TABLE_NAME
  └── CloudWatch Log Group

web-stack
  ├── Lambda Function（Next.js SSR、スタブ）
  ├── CloudFront Distribution
  ├── S3 Bucket（静的アセット）
  └── CloudWatch Log Group
```

## Lambda レスポンス構造

### ヘルスチェック（DynamoDB 接続成功）

```json
{
  "statusCode": 200,
  "body": {
    "status": "healthy",
    "timestamp": "2026-04-12T00:00:00.000Z",
    "db": "connected",
    "dbLatencyMs": 8
  }
}
```

### DynamoDB 接続確認（失敗）

```json
{
  "statusCode": 200,
  "body": {
    "status": "healthy",
    "timestamp": "2026-04-12T00:00:00.000Z",
    "db": "error",
    "dbError": "AccessDeniedException: ..."
  }
}
```

## デプロイ手順フロー

```
1. cdk synth    → CloudFormation テンプレート生成・リソース一覧確認
2. cdk diff     → 現環境との差分確認（初回は全リソースが "+" 表示）
3. cdk deploy   → batch-stack + web-stack をデプロイ（約 3〜5 分）
4. aws lambda invoke → ヘルスチェック + DynamoDB 接続確認
5. cdk diff     → 「変更なし」で冪等性確認
```

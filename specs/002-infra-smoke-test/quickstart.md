# Quickstart: Infrastructure Smoke Test

## 前提条件

- AWS CLI 設定済み（`aws configure` または環境変数）
- Node.js 22 + pnpm インストール済み
- CDK ブートストラップ済み（初回のみ: `pnpm --filter @oripa-now/infra run deploy -- bootstrap`）

## 手順

### 1. 依存インストール

```bash
pnpm install
```

### 2. デプロイ前リソース確認

```bash
# CloudFormation テンプレート生成（リソース一覧確認）
pnpm --filter @oripa-now/infra run synth

# 現環境との差分確認（初回は全リソースが + 表示）
pnpm --filter @oripa-now/infra run diff
```

出力例:
```
Stack batch-stack
[+] AWS::DynamoDB::Table OripaTable ...
[+] AWS::IAM::Role HealthCheckServiceRole ...
[+] AWS::IAM::Policy HealthCheckServiceRoleDefaultPolicy ...
[+] AWS::Lambda::Function HealthCheck ...
[+] AWS::Logs::LogGroup HealthCheckLogGroup ...

Stack web-stack
[+] AWS::Lambda::Function NextjsFunction ...
[+] AWS::CloudFront::Distribution Distribution ...
[+] AWS::S3::Bucket AssetBucket ...
[+] AWS::Logs::LogGroup NextjsLogGroup ...
```

### 3. デプロイ実行

```bash
pnpm --filter @oripa-now/infra run deploy -- --all --require-approval never
```

所要時間の目安: 約 3〜5 分（VPC・Aurora がないため高速）

### 4. Lambda ヘルスチェック確認

```bash
aws lambda invoke \
  --function-name oripa-now-batch \
  --payload '{}' \
  --cli-binary-format raw-in-base64-out \
  response.json && cat response.json
```

期待レスポンス:
```json
{"statusCode":200,"body":{"status":"healthy","timestamp":"...","db":"connected","dbLatencyMs":8}}
```

### 5. 冪等性確認

```bash
pnpm --filter @oripa-now/infra run diff  # 「There were no differences」と表示されることを確認
```

### 6. クリーンアップ（必要な場合）

```bash
pnpm --filter @oripa-now/infra run destroy -- --all --force
```

## トラブルシューティング

| 症状 | 原因の可能性 | 対処 |
|---|---|---|
| `{"db":"error","dbError":"AccessDeniedException"}` | IAM ポリシー不足 | Lambda 実行ロールの DynamoDB 権限を確認 |
| `{"db":"error","dbError":"ResourceNotFoundException"}` | テーブル名の環境変数ミス | `DYNAMODB_TABLE_NAME` の値を確認 |
| デプロイ失敗（ROLLBACK） | IAM 権限不足 | CDK 実行ロールの権限確認 |
| `spawnSync pnpm ENOENT` | pnpm が PATH にない | corepack で pnpm を有効化するか `package.json` の PATH 設定を確認 |

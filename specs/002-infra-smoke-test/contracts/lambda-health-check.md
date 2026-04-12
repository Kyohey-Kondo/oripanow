# Contract: Lambda Health Check

**Handler**: `apps/batch/src/index.handler`
**Trigger**: 手動呼び出し（`aws lambda invoke`）または EventBridge（本フィーチャーでは未使用）

## Input

```json
{}
```

ペイロードは無視される（任意の JSON を受け付ける）。

## Output

### 成功（DB 接続あり）

```json
{
  "statusCode": 200,
  "body": {
    "status": "healthy",
    "timestamp": "2026-04-12T00:00:00.000Z",
    "db": "connected",
    "dbLatencyMs": 12
  }
}
```

### 成功（DB 接続なし / エラー）

```json
{
  "statusCode": 200,
  "body": {
    "status": "healthy",
    "timestamp": "2026-04-12T00:00:00.000Z",
    "db": "error",
    "dbError": "Connection refused"
  }
}
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `DYNAMODB_TABLE_NAME` | DynamoDB テーブル名（デフォルト: `oripa-now`） |

## 制約

- 応答は 30 秒以内
- `statusCode` は常に 200（DB 接続失敗は診断情報として `body` に含める）
- `db` フィールドは必ず `"connected"` または `"error"` のいずれか

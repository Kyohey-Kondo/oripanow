# Quickstart: SSR Sample Page

## 前提条件

- AWS CLI 設定済み、`dev-web-stack` がデプロイ済み
- Node.js 22 + pnpm インストール済み

## ローカル開発

```bash
# 依存インストール
pnpm install

# 開発サーバー起動（Next.js）
pnpm --filter @oripa-now/web dev
# → http://localhost:3000 でスタブデータ込みのページを確認
```

## ビルド & デプロイ

```bash
# 1. Next.js standalone ビルド
pnpm --filter @oripa-now/web build
# → apps/web/.next/standalone/ が生成される

# 2. CDK デプロイ（web-stack のみ）
DEPLOY_ENV=dev pnpm --filter @oripa-now/infra run deploy -- dev-web-stack --require-approval never
```

## 動作確認

```bash
# CloudFront ドメインを取得
DOMAIN=$(aws cloudformation describe-stacks \
  --stack-name dev-web-stack \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionDomain'].OutputValue" \
  --output text)

# SSR 確認（JavaScript なしで HTML にデータが含まれることを確認）
curl -s "https://$DOMAIN/" | grep -E "(カードショップ|オリパ|¥)"
```

期待出力（HTML ソース内に以下の文字列が含まれる）:
```
カードショップ秋葉原
ポケモンカードオリパ
¥3,000
```

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `{"status":"ok"}` が返る | CDK デプロイが古いまま | `cdk deploy dev-web-stack` を再実行 |
| 500 エラー | Lambda がクラッシュ | CloudWatch Logs `/aws/lambda/dev-oripa-now-nextjs` を確認 |
| HTML にデータが含まれない | SSR でなく CSR になっている | Server Component に `'use client'` が付いていないか確認 |

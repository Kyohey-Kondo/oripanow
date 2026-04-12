# oripa-now 要件定義ドラフト

**バージョン**: 0.1  
**作成日**: 2026-04-12  
**ステータス**: ドラフト

---

## 1. プロジェクト概要

### 目的

ポケモンカード（ポケカ）専門店舗が Twitter / X に投稿するオリジナルパック（オリパ）の発売情報を自動収集・構造化し、エンドユーザーが「今日どこの店舗に行けばオリパが買えるか」を一目で把握できる Web サービスを提供する。

### プロジェクト名

`oripa-now`

---

## 2. 解決する課題

- オリパの発売情報が各店舗の Twitter アカウントに散在しており、ユーザーが複数アカウントを個別に確認する必要がある
- 発売タイミングを逃すと売り切れになるため、情報収集の手間が購買機会の損失につながっている
- 「今どの店舗に在庫があるか」を一箇所で把握できるサービスが存在しない

---

## 3. ターゲット

- **エリア**: 東京（特定エリア）および大宮
- **ジャンル**: ポケモンカードのオリパのみ（将来的に他 TCG へ拡張可）
- **ユーザー**: ポケカ購入を検討している一般ユーザー

---

## 4. 機能要件

### 4.1 データ収集（バッチ）

| # | 機能 | 詳細 |
|---|------|------|
| F-01 | ツイート定期取得 | 登録済み店舗アカウントのツイートを1日1回取得 |
| F-02 | 重複排除 | `tweet_id` をキーに、取得済みツイートを再保存しない |
| F-03 | AI 解析 | Claude API を使いツイート本文から構造化データを抽出 |
| F-04 | DB 保存 | 解析結果を `oripa_posts` テーブルに保存 |
| F-05 | 未解析キュー | 解析失敗ツイートを `is_processed = false` のまま残し、管理者が確認できるようにする |

#### AI 解析で抽出する項目

- 発売日時（`sale_at`）
- 価格（`price`）
- 口数 / 在庫数（`stock_count`）
- 在庫ステータス（`status`）

### 4.2 エンドユーザー向け機能

| # | 機能 | 詳細 |
|---|------|------|
| F-10 | トップページ | 在庫ありの店舗一覧を今日の新着順で表示 |
| F-11 | エリア別ページ | 東京・大宮それぞれのオリパ一覧ページ |
| F-12 | 店舗詳細ページ | 店舗情報と最新オリパ一覧を表示 |
| F-13 | フィルタ | 在庫ステータス・価格帯での絞り込み |
| F-14 | ツイートリンク | 元ツイートへのリンクを表示（情報の一次ソースを明示） |

### 4.3 管理者向け機能

| # | 機能 | 詳細 |
|---|------|------|
| F-20 | 店舗アカウント登録 | 監視対象の Twitter アカウントを登録・削除 |
| F-21 | 解析結果確認 | AI 解析結果の確認・手動修正 |
| F-22 | ステータス更新 | `oripa_posts` のステータスを手動で変更 |

---

## 5. 非機能要件

| 項目 | 目標値 |
|------|--------|
| 情報更新頻度 | 1日1回（毎朝 AM 6:00 JST） |
| API 応答速度 | 500ms 以内（P95） |
| SEO 対応 | SSR / ISR によるサーバーサイドレンダリング |
| 可用性 | サーバーレス構成によりダウンタイムを最小化 |
| スケーラビリティ | 将来的な全国展開・ジャンル追加に対応できる設計 |

---

## 6. システム構成

### 6.1 アーキテクチャ概要

サーバーレス指向の AWS 完結構成。

```
ユーザー
  └─ CloudFront（CDN・HTTPS）
       └─ Lambda（Next.js SSR / OpenNext）
            └─ Aurora Serverless v2（PostgreSQL 互換）

EventBridge Scheduler（毎朝 AM 6:00 JST）
  └─ Lambda（バッチ）
       ├─ Twitter API v2（ツイート取得）
       ├─ Claude API（AI 解析）
       └─ Aurora Serverless v2（保存）
```

### 6.2 技術スタック

| 領域 | 採用技術 | 備考 |
|------|----------|------|
| フロントエンド | Next.js (App Router) | SSR + ISR |
| ホスティング | CloudFront + Lambda (OpenNext) | AWS 完結 |
| バッチ実行 | EventBridge Scheduler + Lambda | 1日1回 cron |
| データベース | DynamoDB | サーバーレス・VPC 不要・IAM 認証 |
| DB クライアント | AWS SDK v3 (DynamoDB DocumentClient) | TypeScript ファースト |
| IaC | AWS CDK | TypeScript で定義 |
| AI 解析 | Claude API | ツイート本文の構造化抽出 |
| Twitter 取得 | Twitter API v2 (Search Recent) | Basic プラン |
| 地図 | Google Maps API | 無料枠内 |

### 6.3 モノリポ構成

```
oripa-now/
├── apps/
│   ├── web/               # Next.js（フロントエンド）
│   │   ├── app/           # App Router ページ
│   │   ├── components/
│   │   └── lib/
│   └── batch/             # Lambda バッチ
│       └── src/
│           ├── index.ts   # ハンドラー（エントリーポイント）
│           ├── fetch.ts   # Twitter API 取得
│           ├── parse.ts   # Claude API 解析
│           └── save.ts    # DB 保存
│
├── packages/
│   ├── db/                # DynamoDB テーブル定義・クライアント
│   │   └── schema/
│   ├── types/             # 共有型定義
│   └── config/            # ESLint・TSConfig 共通設定
│
├── infra/
│   └── cdk/
│       ├── bin/app.ts     # CDK エントリーポイント
│       └── lib/
│           ├── web-stack.ts    # CloudFront + Lambda
│           └── batch-stack.ts  # EventBridge + Lambda + DynamoDB
│
├── package.json           # pnpm workspaces
├── turbo.json             # Turborepo
└── tsconfig.base.json
```

---

## 7. データベース設計（DynamoDB）

### 7.1 テーブル構成

Single Table Design。テーブル名: `oripa-now`

#### Primary Key

| 属性 | 役割 |
|---|---|
| PK (Partition Key) | エンティティ識別子 |
| SK (Sort Key) | エンティティ識別子 or ソート用複合値 |

#### アイテム種別

**Store（店舗マスタ）**

| PK | SK | 主な属性 |
|---|---|---|
| `STORE#<id>` | `STORE#<id>` | twitter_username, name, area, address, lat, lng, is_active |

**OripaPost（AI解析済みオリパ）**

| PK | SK | 主な属性 |
|---|---|---|
| `POST#<id>` | `POST#<id>` | store_id, status, price, stock_count, sale_at, raw_text, tweet_id, created_at |
| | | ＋ 非正規化: store_name, store_address, lat, lng |

**Tweet（ツイート生データ）**

| PK | SK | 主な属性 |
|---|---|---|
| `STORE#<store_id>` | `TWEET#<tweeted_at>#<tweet_id>` | tweet_id, content, is_processed, fetched_at |

### 7.2 GSI（Global Secondary Index）

| GSI | GSI PK | GSI SK | 用途 |
|---|---|---|---|
| GSI1 | `<area>#<status>` | `<sale_at_date>#<created_at>` | トップ・エリア別ページ |
| GSI2 | `STORE#<store_id>` | `CREATED#<created_at>` | 店舗詳細ページ |
| GSI3 | `UNPROCESSED`（sparse） | `FETCHED#<fetched_at>` | バッチ未処理ツイート取得 |

### 7.3 主要クエリパターン

```
# エリア別・在庫あり・今日のオリパ一覧
GSI1: PK="tokyo#on_sale", SK begins_with "2026-04-12", 降順

# 未処理ツイートの取得（バッチ用）
GSI3: PK="UNPROCESSED"

# 店舗詳細ページ用（最新5件）
GSI2: PK="STORE#<id>", 降順 Limit 5
```

---

## 8. SEO 設計

| URL パターン | 生成方式 | 内容 |
|--------------|----------|------|
| `/` | ISR（毎朝更新） | トップ・在庫あり店舗一覧 |
| `/stores` | ISR | 全店舗一覧 |
| `/stores/[id]` | ISR | 店舗詳細 + オリパ一覧 |
| `/area/tokyo` | ISR | 東京エリアまとめ |
| `/area/omiya` | ISR | 大宮エリアまとめ |

エリア・店舗ごとに URL を持たせることで「新宿 ポケカ オリパ」などのローカル検索への最適化を図る。

---

## 9. コスト試算

| サービス | プラン | 月額目安 |
|----------|--------|----------|
| Twitter API | Basic | $100 |
| Claude API | 従量課金 | ~$5（店舗20件×30ツイート程度） |
| DynamoDB | オンデマンド | ~$1 |
| CloudFront + Lambda | 無料枠内 | ~$0 |
| EventBridge + Lambda | 無料枠内 | ~$0 |
| Google Maps API | 無料枠内（$200）| ~$0 |
| **合計** | | **~$106/月** |

> Twitter API が最大コスト。初期フェーズは Free プランで監視対象を絞り（月1,500リクエスト）、店舗数が増えたタイミングで Basic へ移行する段階的アプローチも検討。

---

## 10. 未決事項（要確認）

| # | 項目 | 選択肢 |
|---|------|--------|
| U-01 | `status` の自動遷移 | `upcoming` → `on_sale` を時刻で自動更新するか、次のバッチまで待つか |
| U-02 | 解析失敗時の扱い | `NULL` 許容でレコード作成 vs 未処理キューのみに残す |
| U-03 | 同一オリパの再ツイート対応 | 新レコード作成 vs 既存レコード更新 |
| U-04 | 管理画面の実装方針 | Next.js の管理ルート vs 別アプリ |
| U-05 | 東京エリアの範囲定義 | 具体的な区・エリアを確定する |

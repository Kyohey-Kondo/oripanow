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
| データベース | Aurora Serverless v2 (PostgreSQL) | RDB 採用（柔軟なクエリ対応） |
| ORM | Drizzle ORM | TypeScript ファースト |
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
│   ├── db/                # Drizzle ORM スキーマ・マイグレーション
│   │   ├── schema/
│   │   └── migrations/
│   ├── types/             # 共有型定義
│   └── config/            # ESLint・TSConfig 共通設定
│
├── infra/
│   └── cdk/
│       ├── bin/app.ts     # CDK エントリーポイント
│       └── lib/
│           ├── web-stack.ts    # CloudFront + Lambda
│           ├── batch-stack.ts  # EventBridge + Lambda
│           └── db-stack.ts     # Aurora Serverless v2
│
├── package.json           # pnpm workspaces
├── turbo.json             # Turborepo
└── tsconfig.base.json
```

---

## 7. データベーススキーマ

### 7.1 テーブル一覧

#### `stores`（店舗マスタ）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | uuid | PK | |
| twitter_username | text | NOT NULL, UNIQUE | Twitter アカウント名 |
| name | text | NOT NULL | 店舗名 |
| area | text | NOT NULL | `tokyo` \| `omiya` |
| address | text | | 住所 |
| lat | real | | 緯度 |
| lng | real | | 経度 |
| is_active | boolean | NOT NULL, DEFAULT true | 監視対象フラグ |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

#### `tweets`（取得ツイート生データ）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | uuid | PK | |
| store_id | uuid | FK → stores.id | |
| tweet_id | text | NOT NULL, UNIQUE | Twitter の ID（重複排除キー） |
| content | text | NOT NULL | ツイート本文 |
| tweeted_at | timestamp | NOT NULL | ツイート日時 |
| is_processed | boolean | NOT NULL, DEFAULT false | AI 解析済みフラグ |
| fetched_at | timestamp | NOT NULL | 取得日時 |

#### `oripa_posts`（AI 解析済みオリパ情報）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | uuid | PK | |
| store_id | uuid | FK → stores.id | |
| tweet_id | uuid | FK → tweets.id | |
| status | text | NOT NULL | `on_sale` \| `sold_out` \| `upcoming` |
| price | integer | NULL 許容 | 円（例: 500）。取得不可の場合 NULL |
| stock_count | integer | NULL 許容 | 口数（例: 20）。取得不可の場合 NULL |
| sale_at | timestamp | NULL 許容 | 発売日時。不明な場合 NULL |
| raw_text | text | NOT NULL | 解析元ツイート本文（検証用） |
| created_at | timestamp | NOT NULL | |
| updated_at | timestamp | NOT NULL | |

#### インデックス

```sql
CREATE INDEX oripa_posts_store_id_idx ON oripa_posts (store_id);
CREATE INDEX oripa_posts_status_idx   ON oripa_posts (status);
CREATE INDEX oripa_posts_sale_at_idx  ON oripa_posts (sale_at);
```

### 7.2 主要クエリパターン

```sql
-- エリア別・在庫あり・今日のオリパ一覧
SELECT o.*, s.name, s.address, s.lat, s.lng
FROM oripa_posts o
INNER JOIN stores s ON o.store_id = s.id
WHERE s.area = 'tokyo'
  AND o.status = 'on_sale'
  AND DATE(o.sale_at) = CURRENT_DATE
ORDER BY o.created_at DESC;

-- 未処理ツイートの取得（バッチ用）
SELECT * FROM tweets WHERE is_processed = false;

-- 店舗詳細ページ用（最新5件）
SELECT * FROM oripa_posts
WHERE store_id = $1
ORDER BY created_at DESC
LIMIT 5;
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
| Aurora Serverless v2 | 最小構成 | ~$15 |
| CloudFront + Lambda | 無料枠内 | ~$0 |
| EventBridge + Lambda | 無料枠内 | ~$0 |
| Google Maps API | 無料枠内（$200）| ~$0 |
| **合計** | | **~$120/月** |

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

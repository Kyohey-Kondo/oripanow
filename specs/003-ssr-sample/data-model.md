# Data Model: SSR Sample Page

**Feature**: 003-ssr-sample
**Date**: 2026-04-12

## スタブデータ構造

### OripaPost（スタブ）

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | string | 識別子（例: `post-001`） |
| `storeName` | string | 店舗名（例: `カードショップ秋葉原`） |
| `productName` | string | 商品名（例: `ポケモンカードオリパ 151弾`） |
| `saleDate` | string | 販売日（ISO 8601, 例: `2026-04-15`） |
| `price` | number | 価格（円、例: `3000`） |

### スタブデータ例（3〜5 件）

```typescript
export const STUB_ORIPA_POSTS: OripaPost[] = [
  {
    id: 'post-001',
    storeName: 'カードショップ秋葉原',
    productName: 'ポケモンカードオリパ 151弾',
    saleDate: '2026-04-15',
    price: 3000,
  },
  {
    id: 'post-002',
    storeName: 'トレカ通販センター',
    productName: 'テラスタルオリパ プレミアム',
    saleDate: '2026-04-16',
    price: 5000,
  },
  {
    id: 'post-003',
    storeName: 'カードパラダイス池袋',
    productName: 'レアリティコレクションオリパ',
    saleDate: '2026-04-18',
    price: 2000,
  },
];
```

## ページ表示内容

```
オリパ発売情報

[店舗名]   [商品名]   [販売日]   [価格]
カードショップ秋葉原   ポケモンカードオリパ 151弾   2026-04-15   ¥3,000
...
```
